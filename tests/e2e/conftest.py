"""
Konfiguracja pytest dla testów e2e.

truststore: na maszynach za firmowym proxy (podmienione certyfikaty TLS)
standardowy bundle certifi nie zawiera lokalnego CA i każde żądanie HTTPS
kończy się SSLCertVerificationError. truststore przełącza weryfikację TLS
na systemowy magazyn certyfikatów Windows (odpowiednik `node --use-system-ca`).
"""
import os

try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    # Bez truststore testy działają na maszynach z normalnym łańcuchem TLS
    pass

# gRPC (klient Firestore) ma własny stos SSL (BoringSSL) i ignoruje zarówno
# certifi, jak i truststore. Wskazujemy mu bundle = certifi + CA z magazynu
# Windows (generowany lokalnie, patrz Audyty/12.06_imprezy_podsumowanie_wdrożenia.md;
# katalog secrets/ jest poza gitem). Musi być ustawione PRZED importem grpc.
_CA_BUNDLE = os.path.join(os.path.dirname(__file__), "secrets", "ca_bundle.pem")
if os.path.isfile(_CA_BUNDLE) and not os.environ.get("GRPC_DEFAULT_SSL_ROOTS_FILE_PATH"):
    os.environ["GRPC_DEFAULT_SSL_ROOTS_FILE_PATH"] = _CA_BUNDLE
