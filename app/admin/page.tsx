"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Selection = {
  id: string;
  client_name: string;
  photo_name: string;
  created_at: string;
};

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [clientName, setClientName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [copied, setCopied] = useState(false);

  const [selections, setSelections] = useState<Selection[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const [activePhotos, setActivePhotos] = useState<Selection[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const [deletedClients, setDeletedClients] = useState<string[]>([]);
  const [favoritePhotos, setFavoritePhotos] = useState<string[]>([]);

  const cleanClientName = clientName.trim().toLowerCase().replace(/\s+/g, "-");

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://galeria.afrikanitasstudio.com";

  const expiresAt = Date.now() + 72 * 60 * 60 * 1000;

  const clientLink = cleanClientName
    ? `${SITE_URL}/?cliente=${cleanClientName}&exp=${expiresAt}`
    : "";

  useEffect(() => {
    const savedDeletedClients = localStorage.getItem("deletedClients");
    const savedFavorites = localStorage.getItem("favoritePhotos");

    if (savedDeletedClients) {
      setDeletedClients(JSON.parse(savedDeletedClients));
    }

    if (savedFavorites) {
      setFavoritePhotos(JSON.parse(savedFavorites));
    }

    checkSession();
  }, []);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("new-selections")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "selections" },
        () => fetchSelections()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const checkSession = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setLoading(false);

    if (data.session) {
      await fetchSelections();
    }
  };

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Email ou senha incorretos.");
      return;
    }

    checkSession();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const fetchSelections = async () => {
    const { data, error } = await supabase
      .from("selections")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error.message);
      return;
    }

    setSelections((data || []) as Selection[]);
  };

  const uploadPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files.length === 0) return;

    if (!cleanClientName) {
      alert("Escreva o nome da cliente antes de carregar as fotografias.");
      return;
    }

    setUploading(true);
    setUploadMessage("");

    try {
      const uploads = Array.from(files).map(async (file) => {
        const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
        const fileName = `${cleanClientName}/${Date.now()}-${safeName}`;

        return supabase.storage.from("photos").upload(fileName, file, {
          cacheControl: "31536000",
          upsert: false,
        });
      });

      const results = await Promise.all(uploads);
      const failed = results.find((result) => result.error);

      if (failed?.error) {
        alert("Erro ao fazer upload: " + failed.error.message);
        return;
      }

      setUploadMessage("Fotografias carregadas com sucesso.");
      event.target.value = "";
    } catch (error) {
      console.log(error);
      alert("Erro ao carregar fotografias.");
    } finally {
      setUploading(false);
    }
  };

  const deleteClient = async (client: string) => {
    const ok = confirm(`Tem certeza que deseja apagar a cliente "${client}"?`);
    if (!ok) return;

    const { data: files } = await supabase.storage
      .from("photos")
      .list(client, { limit: 1000 });

    if (files && files.length > 0) {
      const filePaths = files.map((file) => `${client}/${file.name}`);
      await supabase.storage.from("photos").remove(filePaths);
    }

    await supabase.from("selections").delete().eq("client_name", client);

    setSelections((prev) => prev.filter((item) => item.client_name !== client));
    alert("Cliente apagada com sucesso.");
  };

  const openPhoto = (photos: Selection[], index: number) => {
    setActivePhotos(photos);
    setActiveIndex(index);
  };

  const closePhoto = () => {
    setActivePhotos([]);
    setActiveIndex(null);
  };

  const nextPhoto = () => {
    if (activeIndex === null) return;
    setActiveIndex((activeIndex + 1) % activePhotos.length);
  };

  const previousPhoto = () => {
    if (activeIndex === null) return;
    setActiveIndex(activeIndex === 0 ? activePhotos.length - 1 : activeIndex - 1);
  };

  const toggleFavorite = (photo: string) => {
    const updated = favoritePhotos.includes(photo)
      ? favoritePhotos.filter((item) => item !== photo)
      : [...favoritePhotos, photo];

    setFavoritePhotos(updated);
    localStorage.setItem("favoritePhotos", JSON.stringify(updated));
  };
const getCleanPhotoName = (photoUrl: string) => {
  const decoded = decodeURIComponent(photoUrl);
  const fileName = decoded.split("/").pop()?.split("?")[0] || "";

  return fileName.replace(/^\d+-/, "");
};

const convertToRawName = (photoUrl: string) => {
  const cleanName = getCleanPhotoName(photoUrl);
  return cleanName.replace(/\.(jpg|jpeg|png|webp)$/i, ".CR3");
};

const exportRawNames = (client: string, photos: Selection[]) => {
  const rawNames = photos.map((photo) => convertToRawName(photo.photo_name));

  const content = rawNames.join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${client}-fotos-raw.txt`;
  link.click();

  URL.revokeObjectURL(url);
};
  const whatsappText = encodeURIComponent(
    `Olá ${clientName}, tudo bem? 😃\n\nA sua galeria Afrikanitas Studio já está pronta, por favor escolha as suas fotos favoritas. As fotografias escolhidas serão editadas com todo o cuidado e carinho pela nossa equipa.\n\nClique no link abaixo para escolher as suas fotografias favoritas:\n\n${clientLink}\n\nEste link expira em 72 horas.\n\nCom carinho,\nAfrikanitas Studio`
  );

  const whatsappLink =
    whatsapp.trim() && clientLink
      ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${whatsappText}`
      : "";

  const copyLink = async () => {
    if (!clientLink) {
      alert("Escreva o nome da cliente primeiro.");
      return;
    }

    await navigator.clipboard.writeText(clientLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const groupedSelections = useMemo(() => {
    const groups: Record<string, Selection[]> = {};

    selections.forEach((item) => {
      const name = item.client_name || "cliente-sem-nome";
      if (!groups[name]) groups[name] = [];
      groups[name].push(item);
    });

    return groups;
  }, [selections]);

  const filteredGroups = useMemo(() => {
    return Object.entries(groupedSelections).filter(([client]) =>
      client.toLowerCase().includes(filter.toLowerCase())
    );
  }, [groupedSelections, filter]);

  const totalClients = Object.keys(groupedSelections).length;
  const totalPhotos = selections.length;
  const activePhoto = activeIndex !== null ? activePhotos[activeIndex] : null;

  if (loading) {
    return <main style={styles.loadingPage}>A carregar Afrikanitas Studio...</main>;
  }

  if (!session) {
    return (
      <main style={styles.loginPage}>
        <section style={styles.loginCard}>
          <h1 style={styles.loginTitle}>Afrikanitas Studio</h1>
          <p style={styles.muted}>Área privada do administrador.</p>

          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />

          <button onClick={login} style={styles.blackButton}>Entrar</button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brandArea}>
          <img src="/logo.png" alt="Afrikanitas Studio" style={styles.logoSmall} />
          <div>
            <h1 style={styles.title}>Estúdio Afrikanitas</h1>
            <p style={styles.subtitle}>Painel premium de clientes, galerias e fotografias escolhidas.</p>
          </div>
        </div>
        <button onClick={logout} style={styles.logoutButton}>Sair</button>
      </header>

      <section style={styles.statsGrid}>
        <div style={styles.statCard}><p style={styles.statLabel}>Total de clientes</p><strong style={styles.statNumber}>{totalClients}</strong></div>
        <div style={styles.statCard}><p style={styles.statLabel}>Fotos selecionadas</p><strong style={styles.statNumber}>{totalPhotos}</strong></div>
        <div style={styles.statCard}><p style={styles.statLabel}>Status</p><strong style={styles.online}>Online</strong></div>
        <div style={styles.statCard}><p style={styles.statLabel}>Última atualização</p><strong style={styles.statText}>Agora há pouco</strong></div>
      </section>

      <section style={styles.topGrid}>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Carregar fotografias</h2>
          <p style={styles.muted}>Escreva o nome da cliente e carregue as fotografias.</p>

          <input type="text" placeholder="Nome da cliente" value={clientName} onChange={(e) => setClientName(e.target.value)} style={styles.input} />
          <input type="file" multiple accept="image/*" onChange={uploadPhotos} style={styles.input} />

          <p style={styles.small}>Formatos aceites: JPG, JPEG, PNG, WEBP</p>

          <button style={styles.blackButton} disabled={uploading}>
            {uploading ? "A carregar..." : "Carregar fotografias"}
          </button>

          {uploadMessage && <p style={styles.success}>{uploadMessage}</p>}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Gerar link da cliente</h2>

          <input type="text" placeholder="Nome da cliente" value={clientName} onChange={(e) => setClientName(e.target.value)} style={styles.input} />
          <input type="text" placeholder="WhatsApp da cliente. Ex: 244923000000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} style={styles.input} />

          <div style={styles.linkBox}>
            <span style={styles.linkText}>{clientLink || "Link da galeria será gerado aqui"}</span>
            <button onClick={copyLink} style={styles.copyButton}>{copied ? "Copiado" : "Copiar link"}</button>
          </div>

          {whatsappLink && (
            <a href={whatsappLink} target="_blank" style={{ textDecoration: "none" }}>
              <button style={styles.whatsappButton}>Enviar WhatsApp</button>
            </a>
          )}
        </div>
      </section>

      <section>
        <h2 style={styles.sectionTitleBig}>Seleções por cliente</h2>

        <input type="text" placeholder="Filtrar cliente automaticamente..." value={filter} onChange={(e) => setFilter(e.target.value)} style={styles.searchInput} />

        {filteredGroups.length === 0 && <p style={styles.muted}>Ainda não há seleções.</p>}

        <div style={styles.clientsList}>
          {filteredGroups.map(([client, photos]) => (
            <div key={client} style={styles.clientCard}>
              <div style={styles.clientTop}>
                <div>
                  <h3 style={styles.clientName}>{client}</h3>
                  <p style={styles.clientCount}>{photos.length} fotografia(s) selecionada(s)</p>
                </div>
 <div style={styles.clientActions}>
  <button
    onClick={() => exportRawNames(client, photos)}
    style={styles.rawButton}
  >
    Exportar RAW
  </button>

  <div style={styles.clientActions}>
  <button
    onClick={() => exportRawNames(client, photos)}
    style={styles.rawButton}
  >
    Exportar RAW
  </button>

  <button onClick={() => deleteClient(client)} style={styles.deleteButton}>
    Apagar cliente
  </button>
</div>
              <div style={styles.photoGrid}>
                {photos.map((item, index) => (
                  <button key={item.id} style={styles.thumbButton} onClick={() => openPhoto(photos, index)}>
                    <img src={item.photo_name} alt="Foto escolhida" style={styles.thumbImage} loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {activePhoto && (
        <div style={styles.modalOverlay} onClick={closePhoto}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalInfo}>
              <strong>{activePhoto.client_name}</strong>
              <span>{activeIndex! + 1} / {activePhotos.length}</span>
            </div>

            <button style={styles.closeButton} onClick={closePhoto}>×</button>
            <button style={styles.arrowLeft} onClick={previousPhoto}>‹</button>

            <img src={activePhoto.photo_name} alt="Foto ampliada" style={styles.modalImage} />

            <button style={styles.arrowRight} onClick={nextPhoto}>›</button>

            <div style={styles.modalBottom}>
              <a href={activePhoto.photo_name} download target="_blank" style={{ textDecoration: "none" }}>
                <button style={styles.downloadModal}>Baixar foto</button>
              </a>

              <button onClick={() => toggleFavorite(activePhoto.photo_name)} style={styles.heartModal}>
                {favoritePhotos.includes(activePhoto.photo_name) ? "♥" : "♡"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const styles = {clientActions: {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
  justifyContent: "flex-end",
},

rawButton: {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #2b1811",
  background: "#2b1811",
  color: "#fff",
  cursor: "pointer",
  fontSize: "14px",
},
  page: { minHeight: "100vh", padding: "28px", fontFamily: "Georgia, 'Times New Roman', serif", background: "linear-gradient(135deg, #f8f1e7, #efe0cb)", color: "#2b2118" },
  loadingPage: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f1e7", fontFamily: "Georgia, serif" },
  loginPage: { minHeight: "100vh", background: "linear-gradient(135deg, #f8f1e7, #efe0cb)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "Georgia, serif" },
  loginCard: { width: "100%", maxWidth: "420px", background: "#fffaf3", border: "1px solid #ddcdb8", borderRadius: "28px", padding: "32px", boxShadow: "0 20px 45px rgba(0,0,0,0.12)", textAlign: "center" as const },
  logo: { width: "90px", height: "auto", marginBottom: "16px" },
  logoSmall: { width: "72px", height: "72px", objectFit: "contain" as const },
  header: { maxWidth: "1200px", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px" },
  brandArea: { display: "flex", alignItems: "center", gap: "18px" },
  title: { fontSize: "38px", lineHeight: 1, margin: 0, fontWeight: 500 },
  loginTitle: { fontSize: "32px", marginBottom: "8px", fontWeight: 500 },
  subtitle: { margin: "8px 0 0", color: "#5f5144", fontSize: "15px" },
  muted: { color: "#5f5144", fontSize: "14px", lineHeight: 1.5 },
  logoutButton: { padding: "13px 25px", borderRadius: "30px", border: "1px solid #d6c5ad", background: "#fffaf3", cursor: "pointer", fontSize: "15px" },
  statsGrid: { maxWidth: "1200px", margin: "0 auto 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px" },
  statCard: { background: "rgba(255,250,243,0.9)", border: "1px solid #ddcdb8", borderRadius: "18px", padding: "22px", boxShadow: "0 8px 24px rgba(0,0,0,0.06)" },
  statLabel: { margin: "0 0 8px", color: "#5f5144", fontSize: "14px" },
  statNumber: { fontSize: "28px", color: "#2b2118" },
  statText: { fontSize: "18px", color: "#2b2118" },
  online: { fontSize: "20px", color: "#1c7c35" },
  topGrid: { maxWidth: "1200px", margin: "0 auto 26px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px" },
  card: { background: "rgba(255,250,243,0.92)", border: "1px solid #ddcdb8", borderRadius: "20px", padding: "22px", boxShadow: "0 10px 25px rgba(0,0,0,0.06)" },
  sectionTitle: { fontSize: "22px", margin: "0 0 12px", fontWeight: 500 },
  sectionTitleBig: { maxWidth: "1200px", margin: "0 auto 14px", fontSize: "26px", fontWeight: 500 },
  input: { width: "100%", boxSizing: "border-box" as const, padding: "13px 15px", borderRadius: "10px", border: "1px solid #d6c5ad", background: "#fffaf3", color: "#2b2118", marginBottom: "12px", fontSize: "14px", outline: "none" },
  searchInput: { width: "100%", maxWidth: "650px", display: "block", boxSizing: "border-box" as const, margin: "0 auto 18px", padding: "15px", borderRadius: "12px", border: "1px solid #d6c5ad", background: "#fffaf3", color: "#2b2118", fontSize: "15px", outline: "none" },
  small: { fontSize: "13px", color: "#5f5144", marginBottom: "14px" },
  blackButton: { padding: "13px 22px", background: "#2b1811", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px" },
  whatsappButton: { marginTop: "12px", padding: "13px 22px", background: "#2f8b43", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px" },
  success: { color: "#2f6f3e", marginTop: "12px" },
  linkBox: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", border: "1px solid #d6c5ad", borderRadius: "10px", padding: "8px", background: "#fffaf3" },
  linkText: { fontSize: "13px", color: "#5f5144", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  copyButton: { flexShrink: 0, padding: "10px 14px", background: "#fffaf3", border: "1px solid #d6c5ad", borderRadius: "8px", cursor: "pointer" },
  clientsList: { maxWidth: "1200px", margin: "0 auto", display: "grid", gap: "22px" },
  clientCard: { background: "rgba(255,250,243,0.95)", border: "1px solid #ddcdb8", borderRadius: "20px", padding: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.06)" },
  clientTop: { display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", marginBottom: "16px" },
  clientName: { fontSize: "25px", margin: "0 0 5px", fontWeight: 500 },
  clientCount: { margin: 0, color: "#5f5144", fontSize: "14px" },
  deleteButton: { padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2b8b8", background: "#fffaf3", color: "#9b2525", cursor: "pointer", fontSize: "14px" },
  photoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" },
  thumbButton: { border: "none", padding: 0, background: "transparent", cursor: "pointer", borderRadius: "10px", overflow: "hidden", height: "118px" },
  thumbImage: { width: "100%", height: "118px", objectFit: "cover" as const, display: "block", borderRadius: "10px", background: "#111" },
  modalOverlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "20px" },
  modalContent: { position: "relative" as const, width: "100%", maxWidth: "1180px", height: "520px", background: "#111", borderRadius: "22px", overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" },
  modalInfo: { position: "absolute" as const, top: "24px", left: "28px", zIndex: 3, color: "#fff", display: "grid", gap: "6px", fontSize: "17px" },
  closeButton: { position: "absolute" as const, top: "22px", right: "24px", zIndex: 4, background: "transparent", color: "#fff", border: "none", fontSize: "38px", cursor: "pointer" },
  modalImage: { width: "100%", height: "100%", objectFit: "contain" as const, display: "block" },
  arrowLeft: { position: "absolute" as const, left: "26px", top: "50%", transform: "translateY(-50%)", zIndex: 4, width: "56px", height: "56px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: "42px", cursor: "pointer" },
  arrowRight: { position: "absolute" as const, right: "26px", top: "50%", transform: "translateY(-50%)", zIndex: 4, width: "56px", height: "56px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: "42px", cursor: "pointer" },
  modalBottom: { position: "absolute" as const, bottom: "26px", left: "50%", transform: "translateX(-50%)", zIndex: 4, display: "flex", gap: "12px" },
  downloadModal: { padding: "13px 18px", borderRadius: "30px", border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", cursor: "pointer", fontSize: "15px" },
  heartModal: { width: "48px", height: "48px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", cursor: "pointer", fontSize: "24px" },
};