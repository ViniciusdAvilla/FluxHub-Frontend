package com.fluxhub.mobile;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.util.Locale;

public class MainActivity extends Activity {
    private static final int FILE_PICKER = 1050;
    private WebView web;
    private LinearLayout panel;
    private ProgressBar progress;
    private String baseUrl;
    private ValueCallback<Uri[]> pendingFiles;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        String preset = BuildConfig.FLUXHUB_URL;
        String previous = getPreferences(MODE_PRIVATE).getString("server_url", null);
        try {
            baseUrl = UrlPolicy.normalizeServerUrl(preset != null && !preset.isBlank() ? preset : previous);
        } catch (IllegalArgumentException invalid) {
            baseUrl = null;
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                root.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setVisibility(View.GONE);
        root.addView(progress, new LinearLayout.LayoutParams(-1, dp(3)));

        FrameLayout frame = new FrameLayout(this);
        root.addView(frame, new LinearLayout.LayoutParams(-1, 0, 1));
        web = new WebView(this);
        frame.addView(web, new FrameLayout.LayoutParams(-1, -1));
        panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(24), dp(24), dp(24), dp(24));
        frame.addView(panel, new FrameLayout.LayoutParams(-1, -1));
        initWebView();

        if (baseUrl == null) {
            notice("Servidor indisponível",
                   "O endereço do frontend não foi definido ao gerar este APK. Compile com FLUXHUB_URL para abrir automaticamente.",
                   "Fechar", this::finish);
        } else {
            load();
        }
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0, this::back);
        }
    }

    private Button button(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(12);
        button.setAllCaps(false);
        button.setTextColor(Color.WHITE);
        button.setBackgroundTintList(ColorStateList.valueOf(Color.rgb(39,93,155)));
        return button;
    }

    @android.annotation.SuppressLint("SetJavaScriptEnabled")
    private void initWebView() {
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(
                (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                if (baseUrl != null && UrlPolicy.isSameOrigin(baseUrl, request.getUrl().toString())) return false;
                external(request.getUrl());
                return true;
            }
            @Override public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) {
                showWeb();
                progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView v, String url) {
                progress.setVisibility(View.GONE);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) connectionError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 500) connectionError();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value);
                if (value >= 100) progress.setVisibility(View.GONE);
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                try {
                    startActivityForResult(Intent.createChooser(params.createIntent(), "Selecionar arquivo"), FILE_PICKER);
                } catch (ActivityNotFoundException ex) {
                    pendingFiles = null;
                    callback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this, "Seletor de arquivos indisponível", Toast.LENGTH_LONG).show();
                }
                return true;
            }
        });
        web.setDownloadListener((url, agent, disposition, mime, length) -> {
            if (url.startsWith("blob:")) {
                Toast.makeText(this, "Use o navegador para baixar este relatório.", Toast.LENGTH_LONG).show();
                return;
            }
            if (baseUrl == null || !UrlPolicy.isSameOrigin(baseUrl, url)) {
                external(Uri.parse(url));
                return;
            }
            try {
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                String cookie = CookieManager.getInstance().getCookie(url);
                if (cookie != null) req.addRequestHeader("Cookie", cookie);
                if (agent != null) req.addRequestHeader("User-Agent", agent);
                if (mime != null) req.setMimeType(mime);
                String filename = URLUtil.guessFileName(url, disposition, mime).replace("/", "_");
                req.setTitle(filename);
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (manager != null) manager.enqueue(req);
                Toast.makeText(this, "Download iniciado", Toast.LENGTH_SHORT).show();
            } catch (Exception failure) {
                Toast.makeText(this, "Erro ao baixar", Toast.LENGTH_LONG).show();
            }
        });
    }

    private void load() {
        showWeb();
        if (baseUrl != null) web.loadUrl(baseUrl);
    }
    private void showWeb() {
        panel.setVisibility(View.GONE);
        web.setVisibility(View.VISIBLE);
    }
    private void connectionError() {
        notice("Sem conexão", "Verifique se os servidores Next.js e Python estão ativos.\n" + baseUrl,
                "Tentar novamente", this::load);
    }
    private void notice(String title, String body, String action, Runnable callback) {
        progress.setVisibility(View.GONE);
        web.setVisibility(View.GONE);
        panel.removeAllViews();
        panel.setVisibility(View.VISIBLE);
        TextView heading = new TextView(this);
        heading.setText(title);
        heading.setTextSize(22);
        heading.setTextColor(Color.rgb(32,38,46));
        heading.setTypeface(null, 1);
        heading.setGravity(Gravity.CENTER);
        panel.addView(heading);
        TextView message = new TextView(this);
        message.setText(body);
        message.setTextSize(15);
        message.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1,-2);
        params.setMargins(0, dp(16), 0, dp(16));
        panel.addView(message, params);
        Button button = button(action);
        panel.addView(button);
        button.setOnClickListener(v -> callback.run());
    }

    private void external(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("https") && !scheme.equals("http")
                && !scheme.equals("mailto") && !scheme.equals("tel")) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ex) {
            Toast.makeText(this, "Nenhum aplicativo pode abrir o link", Toast.LENGTH_SHORT).show();
        }
    }

    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code == FILE_PICKER && pendingFiles != null) {
            pendingFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            pendingFiles = null;
        }
    }

    private void back() {
        if (panel.getVisibility() == View.GONE && web.canGoBack()) web.goBack();
        else finish();
    }
    @Override @SuppressWarnings("deprecation")
    public void onBackPressed() { back(); }

    @Override protected void onDestroy() {
        if (pendingFiles != null) pendingFiles.onReceiveValue(null);
        web.destroy();
        super.onDestroy();
    }
    private int dp(float value) {
        return (int)(value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
