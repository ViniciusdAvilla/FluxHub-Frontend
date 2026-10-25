package com.fluxhub.mobile;

public class UrlPolicyTest {
    public static void main(String[] args) {
        equal("https://fluxhub.exemplo.com/", UrlPolicy.normalizeServerUrl("https://fluxhub.exemplo.com"));
        equal("http://192.168.1.50:3000/", UrlPolicy.normalizeServerUrl(" http://192.168.1.50:3000 "));
        equal("http://127.0.0.1:3000/", UrlPolicy.normalizeServerUrl("http://127.0.0.1:3000"));
        equal("http://10.0.2.2:3000/", UrlPolicy.normalizeServerUrl("http://10.0.2.2:3000"));
        allowed("https://fluxhub.exemplo.com/", "https://fluxhub.exemplo.com/produtos");
        allowed("https://fluxhub.exemplo.com/", "https://fluxhub.exemplo.com:443/api/dashboard");
        denied("https://fluxhub.exemplo.com/", "https://evil.example/phishing");
        denied("https://fluxhub.exemplo.com/", "http://fluxhub.exemplo.com/");
        denied("https://fluxhub.exemplo.com/", "javascript:alert(1)");
        invalid("http://fluxhub.exemplo.com");
        invalid("https://user:password@fluxhub.exemplo.com");
        invalid("https://fluxhub.exemplo.com/path");
        invalid("https://fluxhub.exemplo.com/?a=b");
        invalid("http://192.168.300.1:3000");
        invalid("file:///etc/passwd");
        System.out.println("UrlPolicy: todos os testes passaram.");
    }
    private static void allowed(String base, String url) {
        if (!UrlPolicy.isSameOrigin(base, url)) throw new AssertionError("Deveria permitir " + url);
    }
    private static void denied(String base, String url) {
        if (UrlPolicy.isSameOrigin(base, url)) throw new AssertionError("Deveria bloquear " + url);
    }
    private static void invalid(String url) {
        try { UrlPolicy.normalizeServerUrl(url); throw new AssertionError("Deveria rejeitar " + url); }
        catch (IllegalArgumentException correct) { /* OK */ }
    }
    private static void equal(String expected, String actual) {
        if (!expected.equals(actual)) throw new AssertionError(expected + " != " + actual);
    }
}
