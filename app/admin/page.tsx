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
  const [isDark, setIsDark] = useState(false);

  const cleanClientName = clientName.trim().toLowerCase().replace(/\s+/g, "-");
  const s = getStyles(isDark);

  useEffect(() => {
    checkSession();

    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(darkQuery.matches);

    const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
    darkQuery.addEventListener("change", listener);

    if ("Notification" in window) {
      Notification.requestPermission();
    }

    return () => darkQuery.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("new-selections")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "selections" },
        () => {
          fetchSelections();

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Afrikanitas Studio", {
              body: "Uma cliente acabou de selecionar fotografias.",
            });
          } else {
            alert("Uma cliente acabou de selecionar fotografias.");
          }
        }
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
      fetchSelections();
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
      console.log(error);
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

    for (const file of Array.from(files)) {
      const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
      const fileName = `${cleanClientName}/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage
        .from("photos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        setUploading(false);
        alert("Erro ao fazer upload: " + error.message);
        return;
      }
    }

    setUploading(false);
    setUploadMessage("Fotografias carregadas com sucesso.");
    event.target.value = "";
  };

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://galeria.afrikanitasstudio.com";

  const clientLink = cleanClientName
    ? `${SITE_URL}/?cliente=${cleanClientName}`
    : "";

  const whatsappText = encodeURIComponent(
    `Olá ${clientName}, tudo bem? ✨\n\nA sua galeria Afrikanitas Studio já está pronta.\n\nClique no link abaixo para escolher as suas fotografias favoritas:\n\n${clientLink}\n\nCom carinho,\nAfrikanitas Studio`
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
      const name = item.client_name || "Cliente sem nome";
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

  if (loading) {
    return (
      <main style={s.loadingPage}>
        <div style={{ fontSize: "22px" }}>A carregar Afrikanitas Studio...</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main style={s.loginPage}>
        <section style={s.loginCard}>
          <div style={{ textAlign: "center", marginBottom: "18px" }}>
            <img src="/logo.png" alt="Afrikanitas Studio" style={s.logo} />
          </div>

          <h1 style={s.loginTitle}>Afrikanitas Studio</h1>

          <p style={s.muted}>Área privada do administrador.</p>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={s.inputStyle}
          />

          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={s.inputStyle}
          />

          <button onClick={login} style={s.blackButton}>
            Entrar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={s.mainPage}>
      <header style={s.headerStyle}>
        <div>
          <img src="/logo.png" alt="Afrikanitas Studio" style={s.logoSmall} />

          <h1 style={s.title}>Afrikanitas Studio</h1>

          <p style={s.subtitle}>
            Painel premium de clientes, galerias e fotografias escolhidas.
          </p>
        </div>

        <button onClick={logout} style={s.lightButton}>
          Sair
        </button>
      </header>

      <section style={s.statsGrid}>
        <div style={s.statCard}>
          <h3 style={{ color: s.muted.color }}>Total de clientes</h3>
          <strong style={{ color: s.title.color, fontSize: "34px" }}>
            {totalClients}
          </strong>
        </div>

        <div style={s.statCard}>
          <h3 style={{ color: s.muted.color }}>Fotos selecionadas</h3>
          <strong style={{ color: s.title.color, fontSize: "34px" }}>
            {totalPhotos}
          </strong>
        </div>

        <div style={s.statCard}>
          <h3 style={{ color: s.muted.color }}>Status</h3>
          <strong style={{ color: s.title.color, fontSize: "28px" }}>
            Online
          </strong>
        </div>
      </section>

      <section style={s.card}>
        <h2 style={{ color: s.title.color }}>Carregar fotografias</h2>

        <p style={s.muted}>
          Escreva o nome da cliente e carregue as fotografias. Elas serão
          guardadas na pasta dessa cliente.
        </p>

        <input
          type="text"
          placeholder="Nome da cliente"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          style={s.inputStyle}
        />

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={uploadPhotos}
          style={s.inputStyle}
        />

        {uploading && <p style={s.muted}>A enviar fotografias...</p>}

        {uploadMessage && (
          <p style={{ color: isDark ? "#9ee6a8" : "#2f6f3e" }}>
            {uploadMessage}
          </p>
        )}
      </section>

      <section style={s.card}>
        <h2 style={{ color: s.title.color }}>Gerar link da cliente</h2>

        <input
          type="text"
          placeholder="Nome da cliente"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          style={s.inputStyle}
        />

        <input
          type="text"
          placeholder="WhatsApp da cliente. Ex: 244923000000"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          style={s.inputStyle}
        />

        {clientLink && (
          <p style={{ ...s.muted, wordBreak: "break-all" }}>
            <strong>Link:</strong> {clientLink}
          </p>
        )}

        <button onClick={copyLink} style={s.blackButton}>
          {copied ? "Link copiado" : "Copiar link"}
        </button>

        {whatsappLink && (
          <a href={whatsappLink} target="_blank">
            <button style={s.whatsappButton}>Enviar WhatsApp elegante</button>
          </a>
        )}
      </section>

      <section>
        <h2 style={s.sectionTitle}>Seleções por cliente</h2>

        <input
          type="text"
          placeholder="Filtrar cliente automaticamente..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={s.inputStyle}
        />

        {filteredGroups.length === 0 && (
          <p style={s.muted}>Ainda não há seleções.</p>
        )}

        <div style={{ display: "grid", gap: "24px" }}>
          {filteredGroups.map(([client, photos]) => (
            <div key={client} style={s.card}>
              <h3 style={s.clientTitle}>{client}</h3>

              <p style={s.muted}>
                {photos.length} fotografia(s) selecionada(s)
              </p>

              <div style={s.photoGrid}>
                {photos.map((item) => (
                  <div key={item.id} style={s.photoCard}>
                    {item.photo_name && (
                      <img
                        src={item.photo_name}
                        alt={item.photo_name}
                        style={s.photoImage}
                      />
                    )}

                    <p style={s.photoText}>{item.photo_name}</p>

                    <a href={item.photo_name} download target="_blank">
                      <button style={s.lightButton}>Baixar foto</button>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function getStyles(isDark: boolean) {
  const bg = isDark ? "#15110d" : "#f8f1e7";
  const bg2 = isDark ? "#241b14" : "#efe0cb";
  const cardBg = isDark ? "#241b14" : "#ffffff";
  const text = isDark ? "#f8f1e7" : "#2b2118";
  const muted = isDark ? "#d7c6ad" : "#5f5144";
  const border = isDark ? "#6b5744" : "#d6c5ad";
  const inputBg = isDark ? "#1c1510" : "#fffaf3";

  return {
    logo: {
      maxWidth: "150px",
      height: "auto",
    },

    logoSmall: {
      maxWidth: "120px",
      height: "auto",
      marginBottom: "14px",
    },

    loadingPage: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: bg,
      color: text,
      fontFamily: "Georgia, serif",
    },

    loginPage: {
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${bg}, ${bg2})`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Georgia, serif",
      padding: "24px",
      color: text,
    },

    loginCard: {
      background: cardBg,
      padding: "32px",
      borderRadius: "28px",
      maxWidth: "420px",
      width: "100%",
      boxShadow: "0 20px 50px rgba(0,0,0,0.14)",
      color: text,
    },

    loginTitle: {
      fontSize: "32px",
      marginBottom: "10px",
      fontWeight: 400,
      color: text,
    },

    mainPage: {
      minHeight: "100vh",
      padding: "24px",
      fontFamily: "Georgia, serif",
      background: `linear-gradient(135deg, ${bg}, ${bg2})`,
      color: text,
      overflowX: "hidden" as const,
    },

    headerStyle: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "flex-start",
      gap: "18px",
      marginBottom: "28px",
      color: text,
    },

    title: {
      fontSize: "34px",
      marginBottom: "8px",
      fontWeight: 400,
      color: text,
    },

    subtitle: {
      fontSize: "16px",
      color: muted,
      lineHeight: 1.5,
    },

    sectionTitle: {
      fontSize: "30px",
      marginBottom: "18px",
      color: text,
      fontWeight: 400,
    },

    clientTitle: {
      fontSize: "25px",
      marginBottom: "10px",
      color: text,
      fontWeight: 400,
    },

    muted: {
      color: muted,
      marginBottom: "18px",
      lineHeight: 1.6,
    },

    statsGrid: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "18px",
      marginBottom: "30px",
    },

    photoGrid: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "18px",
    },

    inputStyle: {
      width: "100%",
      boxSizing: "border-box" as const,
      padding: "15px",
      borderRadius: "18px",
      border: `1px solid ${border}`,
      fontSize: "16px",
      display: "block",
      marginBottom: "14px",
      background: inputBg,
      color: text,
      outline: "none",
    },

    blackButton: {
      padding: "14px 24px",
      background: isDark ? "#f8f1e7" : "#111",
      color: isDark ? "#111" : "#fff",
      border: "none",
      borderRadius: "30px",
      cursor: "pointer",
      fontSize: "16px",
      marginRight: "10px",
      marginBottom: "10px",
    },

    whatsappButton: {
      padding: "14px 24px",
      background: "#25D366",
      color: "#fff",
      border: "none",
      borderRadius: "30px",
      cursor: "pointer",
      fontSize: "16px",
      marginBottom: "10px",
    },

    lightButton: {
      padding: "12px 20px",
      background: inputBg,
      color: text,
      border: `1px solid ${border}`,
      borderRadius: "30px",
      cursor: "pointer",
      fontSize: "15px",
    },

    card: {
      background: cardBg,
      padding: "24px",
      borderRadius: "28px",
      marginBottom: "28px",
      boxShadow: "0 14px 35px rgba(0,0,0,0.10)",
      color: text,
    },

    statCard: {
      background: cardBg,
      padding: "24px",
      borderRadius: "24px",
      boxShadow: "0 12px 30px rgba(0,0,0,0.10)",
      color: text,
    },

    photoCard: {
      background: isDark ? "#1c1510" : "#fffaf3",
      padding: "14px",
      borderRadius: "22px",
      color: text,
    },

    photoImage: {
      width: "100%",
      height: "auto",
      maxHeight: "430px",
      objectFit: "contain" as const,
      borderRadius: "18px",
      marginBottom: "10px",
      background: "#111",
    },

    photoText: {
      fontSize: "13px",
      wordBreak: "break-all" as const,
      color: muted,
    },
  };
}
