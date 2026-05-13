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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    checkSession();
  }, []);

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

  const cleanClientName = clientName.trim().toLowerCase().replace(/\s+/g, "-");

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
      <main style={loadingPage}>
        <div style={{ fontSize: "22px" }}>A carregar Afrikanitas Studio...</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main style={loginPage}>
        <section style={loginCard}>
          <h1 style={{ fontSize: "34px", marginBottom: "10px" }}>
            Afrikanitas Studio
          </h1>

          <p style={{ color: "#777", marginBottom: "30px" }}>
            Área privada do administrador.
          </p>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          <button onClick={login} style={blackButton}>
            Entrar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={mainPage}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: "46px", marginBottom: "10px" }}>
            Afrikanitas Studio
          </h1>

          <p style={{ fontSize: "18px", color: "#555" }}>
            Painel premium de clientes, galerias e fotografias escolhidas.
          </p>
        </div>

        <button onClick={logout} style={lightButton}>
          Sair
        </button>
      </header>

      <section style={statsGrid}>
        <div style={statCard}>
          <h3>Total de clientes</h3>
          <strong>{totalClients}</strong>
        </div>

        <div style={statCard}>
          <h3>Fotos selecionadas</h3>
          <strong>{totalPhotos}</strong>
        </div>

        <div style={statCard}>
          <h3>Status</h3>
          <strong>Online</strong>
        </div>
      </section>

      <section style={card}>
        <h2>Gerar link da cliente</h2>

        <input
          type="text"
          placeholder="Nome da cliente"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="WhatsApp da cliente. Ex: 244923000000"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          style={inputStyle}
        />

        {clientLink && (
          <p style={{ wordBreak: "break-all", marginBottom: "18px" }}>
            <strong>Link:</strong> {clientLink}
          </p>
        )}

        <button onClick={copyLink} style={blackButton}>
          {copied ? "Link copiado" : "Copiar link"}
        </button>

        {whatsappLink && (
          <a href={whatsappLink} target="_blank">
            <button style={whatsappButton}>Enviar WhatsApp elegante</button>
          </a>
        )}
      </section>

      <section style={card}>
        <h2>Área do fotógrafo</h2>

        <div style={miniGrid}>
          <div style={miniCard}>Sessões</div>
          <div style={miniCard}>Clientes</div>
          <div style={miniCard}>Status</div>
          <div style={miniCard}>Entregas</div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "32px", marginBottom: "18px" }}>
          Seleções por cliente
        </h2>

        <input
          type="text"
          placeholder="Filtrar cliente automaticamente..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={inputStyle}
        />

        {filteredGroups.length === 0 && <p>Ainda não há seleções.</p>}

        <div style={{ display: "grid", gap: "28px" }}>
          {filteredGroups.map(([client, photos]) => (
            <div key={client} style={card}>
              <h3 style={{ fontSize: "26px", marginBottom: "10px" }}>
                {client}
              </h3>

              <p style={{ color: "#555", marginBottom: "18px" }}>
                {photos.length} fotografia(s) selecionada(s)
              </p>

              <div style={photoGrid}>
                {photos.map((item) => (
                  <div key={item.id} style={photoCard}>
                    {item.photo_name && (
                      <img
                        src={item.photo_name}
                        alt={item.photo_name}
                        style={photoImage}
                      />
                    )}

                    <p style={photoText}>{item.photo_name}</p>

                    <a href={item.photo_name} download target="_blank">
                      <button style={lightButton}>Baixar foto</button>
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

const loadingPage = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8f1e7",
  fontFamily: "Arial",
};

const loginPage = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f8f1e7, #ead8c0)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Arial",
  padding: "30px",
};

const loginCard = {
  background: "#fff",
  padding: "40px",
  borderRadius: "30px",
  maxWidth: "420px",
  width: "100%",
  boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
};

const mainPage = {
  minHeight: "100vh",
  padding: "40px",
  fontFamily: "Arial",
  background: "linear-gradient(135deg, #f8f1e7, #efe0cb)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "35px",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  marginBottom: "35px",
};

const miniGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "18px",
};

const photoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "18px",
};

const inputStyle = {
  width: "100%",
  maxWidth: "480px",
  padding: "15px",
  borderRadius: "16px",
  border: "1px solid #d6c5ad",
  fontSize: "16px",
  display: "block",
  marginBottom: "14px",
};

const blackButton = {
  padding: "14px 24px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: "30px",
  cursor: "pointer",
  fontSize: "16px",
  marginRight: "10px",
  marginBottom: "10px",
};

const whatsappButton = {
  padding: "14px 24px",
  background: "#25D366",
  color: "#fff",
  border: "none",
  borderRadius: "30px",
  cursor: "pointer",
  fontSize: "16px",
};

const lightButton = {
  padding: "12px 20px",
  background: "#fff",
  color: "#111",
  border: "1px solid #d6c5ad",
  borderRadius: "30px",
  cursor: "pointer",
  fontSize: "15px",
};

const card = {
  background: "rgba(255,255,255,0.9)",
  padding: "28px",
  borderRadius: "28px",
  marginBottom: "35px",
  boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
};

const statCard = {
  background: "#fff",
  padding: "24px",
  borderRadius: "24px",
  boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
};

const miniCard = {
  background: "#f8f1e7",
  padding: "22px",
  borderRadius: "20px",
  fontWeight: "bold",
};

const photoCard = {
  background: "#fffaf3",
  padding: "14px",
  borderRadius: "22px",
};

const photoImage = {
  width: "100%",
  height: "220px",
  objectFit: "cover" as const,
  borderRadius: "18px",
  marginBottom: "10px",
};

const photoText = {
  fontSize: "13px",
  wordBreak: "break-all" as const,
  color: "#444",
};