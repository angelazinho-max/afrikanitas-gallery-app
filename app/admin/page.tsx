"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Selection = {
  id: string;
  client_name: string;
  photo_name: string;
  created_at: string;
};

const ADMIN_EMAIL = "admin@afrikanitas.com";
const ADMIN_PASSWORD = "Afrikanitas2026";

export default function AdminPage() {
  const [logged, setLogged] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientName, setClientName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [copied, setCopied] = useState(false);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (localStorage.getItem("afrikanitas_logged") === "true") {
      setLogged(true);
      fetchSelections();
    }
  }, []);

  const fetchSelections = async () => {
    const { data, error } = await supabase
      .from("selections")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setSelections(data as Selection[]);
  };

  const login = () => {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem("afrikanitas_logged", "true");
      setLogged(true);
      fetchSelections();
    } else {
      alert("Email ou senha incorretos.");
    }
  };

  const logout = () => {
    localStorage.removeItem("afrikanitas_logged");
    setLogged(false);
  };

  const cleanClientName = clientName.trim().toLowerCase().replace(/\s+/g, "-");

  const clientLink =
    typeof window !== "undefined" && cleanClientName
      ? `${window.location.origin}/?cliente=${cleanClientName}`
      : "";

  const whatsappText = encodeURIComponent(
    `Olá ${clientName} ✨\n\nAs suas fotografias já estão disponíveis para seleção no Afrikanitas Studio.\n\nEscolha as suas favoritas através do link abaixo:\n\n${clientLink}`
  );

  const whatsappLink =
    whatsapp.trim() && clientLink
      ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${whatsappText}`
      : "";

  const groupedSelections = useMemo(() => {
    const groups: Record<string, Selection[]> = {};

    selections.forEach((item) => {
      const name = item.client_name || "Cliente sem nome";
      if (!groups[name]) groups[name] = [];
      groups[name].push(item);
    });

    return groups;
  }, [selections]);

  const filteredGroups = Object.entries(groupedSelections).filter(([client]) =>
    client.toLowerCase().includes(filter.toLowerCase())
  );

  const copyLink = async () => {
    if (!clientLink) {
      alert("Escreva o nome da cliente.");
      return;
    }

    await navigator.clipboard.writeText(clientLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadClientSelection = (client: string, photos: Selection[]) => {
    const content = photos
      .map((item) => `${item.client_name} - ${item.photo_name} - ${item.created_at}`)
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `selecao-${client}.txt`;
    a.click();

    URL.revokeObjectURL(url);
  };

  if (!logged) {
    return (
      <main style={{ minHeight: "100vh", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial", padding: "30px" }}>
        <div style={{ background: "#f8f1e7", padding: "42px", borderRadius: "30px", width: "100%", maxWidth: "420px" }}>
          <h1>Afrikanitas Studio</h1>
          <p>Acesso privado do administrador.</p>

          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "15px", marginBottom: "14px", borderRadius: "14px", border: "1px solid #ccc" }} />
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "15px", marginBottom: "18px", borderRadius: "14px", border: "1px solid #ccc" }} />

          <button onClick={login} style={{ width: "100%", padding: "15px", borderRadius: "30px", border: "none", background: "#111", color: "#fff" }}>
            Entrar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8f1e7", padding: "40px", fontFamily: "Arial" }}>
      <header style={{ marginBottom: "35px" }}>
        <h1 style={{ fontSize: "48px" }}>Admin Afrikanitas Studio</h1>
        <p>Área do fotógrafo: sessões, clientes, status, entregas e seleções.</p>
        <button onClick={logout} style={{ padding: "10px 20px", borderRadius: "20px", border: "none", background: "#111", color: "#fff" }}>
          Sair
        </button>
      </header>

      <section style={{ background: "#fff", padding: "28px", borderRadius: "28px", marginBottom: "35px" }}>
        <h2>Gerador de link automático</h2>

        <input placeholder="Nome da cliente" value={clientName} onChange={(e) => setClientName(e.target.value)} style={{ width: "100%", maxWidth: "460px", padding: "15px", borderRadius: "16px", border: "1px solid #ccc", marginBottom: "12px", display: "block" }} />

        <input placeholder="WhatsApp. Ex: 244923000000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} style={{ width: "100%", maxWidth: "460px", padding: "15px", borderRadius: "16px", border: "1px solid #ccc", marginBottom: "12px", display: "block" }} />

        {clientLink && <p style={{ wordBreak: "break-all" }}><strong>Link:</strong> {clientLink}</p>}

        <button onClick={copyLink} style={{ padding: "14px 24px", borderRadius: "30px", border: "none", background: "#111", color: "#fff", marginRight: "10px" }}>
          {copied ? "Link copiado" : "Copiar link"}
        </button>

        {whatsappLink && (
          <a href={whatsappLink} target="_blank">
            <button style={{ padding: "14px 24px", borderRadius: "30px", border: "none", background: "#25D366", color: "#fff" }}>
              Enviar WhatsApp
            </button>
          </a>
        )}
      </section>

      <section style={{ marginBottom: "30px" }}>
        <input placeholder="Filtrar cliente" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: "100%", maxWidth: "420px", padding: "15px", borderRadius: "16px", border: "1px solid #ccc" }} />
      </section>

      <section style={{ display: "grid", gap: "26px" }}>
        {filteredGroups.map(([client, photos]) => (
          <div key={client} style={{ background: "#fff", padding: "26px", borderRadius: "28px" }}>
            <h2>{client}</h2>
            <p><strong>Status:</strong> Seleção recebida</p>
            <p><strong>Total:</strong> {photos.length} fotografia(s)</p>
            <p><strong>Entrega:</strong> Pendente</p>

            <button onClick={() => downloadClientSelection(client, photos)} style={{ padding: "12px 22px", borderRadius: "30px", border: "none", background: "#111", color: "#fff", marginBottom: "20px" }}>
              Baixar seleção
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "18px" }}>
              {photos.map((item) => (
                <div key={item.id}>
                  <img src={item.photo_name} alt={item.photo_name} style={{ width: "100%", height: "220px", objectFit: "cover", borderRadius: "18px" }} />
                  <p style={{ fontSize: "13px", wordBreak: "break-all" }}>{item.photo_name}</p>
                  <p style={{ fontSize: "12px", color: "#777" }}>{new Date(item.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}