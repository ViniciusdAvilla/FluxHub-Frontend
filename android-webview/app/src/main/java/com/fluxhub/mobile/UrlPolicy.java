package com.fluxhub.mobile;

import java.net.URI;
import java.util.Locale;

/** Restricts the app WebView to one configured origin. */
public final class UrlPolicy {
    private UrlPolicy() {}

    public static String normalizeServerUrl(String raw) {
        if (raw == null || raw.trim().isEmpty()) throw new IllegalArgumentException("Informe a URL do servidor.");
        try {
            URI uri = new URI(raw.trim());
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            String host = uri.getHost();
            if (host == null || !(scheme.equals("https") || scheme.equals("http"))
                    || uri.getRawUserInfo() != null || uri.getRawQuery() != null
                    || uri.getRawFragment() != null || uri.getPort() == 0 || uri.getPort() > 65535
                    || (uri.getRawPath() != null && !uri.getRawPath().isEmpty() && !uri.getRawPath().equals("/"))) {
                throw new IllegalArgumentException("Informe apenas o endereço principal do FluxHub.");
            }
            if (scheme.equals("http") && !isLocal(host)) {
                throw new IllegalArgumentException("Para servidores públicos use HTTPS.");
            }
            return scheme + "://" + host.toLowerCase(Locale.ROOT) + (uri.getPort() >= 0 ? ":" + uri.getPort() : "") + "/";
        } catch (java.net.URISyntaxException error) {
            throw new IllegalArgumentException("URL inválida.");
        }
    }

    public static boolean isSameOrigin(String base, String other) {
        try {
            URI a = new URI(base);
            URI b = new URI(other);
            return a.getHost() != null && b.getHost() != null && b.getScheme() != null
                    && a.getHost().equalsIgnoreCase(b.getHost())
                    && a.getScheme().equalsIgnoreCase(b.getScheme())
                    && port(a) == port(b) && b.getRawUserInfo() == null;
        } catch (Exception invalid) {
            return false;
        }
    }

    private static int port(URI url) {
        return url.getPort() != -1 ? url.getPort()
                : "https".equalsIgnoreCase(url.getScheme()) ? 443 : 80;
    }

    private static boolean isLocal(String host) {
        String h = host.toLowerCase(Locale.ROOT);
        if (h.equals("localhost") || h.equals("[::1]") || h.equals("::1") || h.endsWith(".local")) return true;
        String[] parts = h.split("\\.");
        if (parts.length != 4) return false;
        int[] n = new int[4];
        try {
            for (int i = 0; i < 4; i++) {
                if (!parts[i].matches("[0-9]{1,3}")) return false;
                n[i] = Integer.parseInt(parts[i]);
                if (n[i] > 255) return false;
            }
        } catch (NumberFormatException bad) {
            return false;
        }
        return n[0] == 127 || n[0] == 10 || n[0] == 192 && n[1] == 168
                || n[0] == 172 && n[1] >= 16 && n[1] <= 31;
    }
}
