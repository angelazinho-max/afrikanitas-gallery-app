"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Selection = {
  id: string;
  client_name: string;
  photo_name: string;
  created_at: string;
};

const ADMIN_PASSWORD = "Afrikanitas2026";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [clientName, setClientName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [copied, setCopied] = useState(false);
  const [selections, setSelections] = useState<Selection[]>([]);

  useEffect(() => {
    if (localStorage.getItem("afrikanitas_admin") === "true") {
      setLogged(true);
    }
  }, []);

  useEffect(() => {
    if (logged) fetchSelections();
  }, [logged]);

  const fetchSelections = async () => {
    const { data, error } = await supabase
      .from("selections")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setSelections(data as Selection[]);
  };

  const cleanClientName = clientName.trim().toLowerCase().replace(/\s+/g, "-");

  const clientLink =
    typeof window !== "undefined" && cleanClientName
      ? `${window.location.origin}/?cliente=${cleanClientName}`
      : "";

  const whatsappMessage = encodeURIComponent(
    `Olá ${clientName}, aqui está o link para escolher as suas fotografias favoritas do Afrikanitas Studio:\n\n${clientLink}`
  );

  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${whatsappMessage}`
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

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("afrikanitas_admin", "true");
      setLogged(true);
    } else {
      alert("Senha incorreta.");
   {clientName && (
  <div>
    <p>
      Link:{" "}
      <strong>
        {`${window.location.origin}/?cliente=${clientName.toLowerCase()}`}
      </strong>
    </p>

    <button
      onClick={() =>
        navigator.clipboard.writeText(
          `${window.location.origin}/?cliente=${clientName.toLowerCase()}`
        )
      }
      style={{
        padding: "10px 18px",
        background: "#111",
        color: "#fff",
        border: "none",
        borderRadius: "20px",
        cursor: "pointer",
      }}
    >
      Copiar link
    </button>
  </div>
)}
  if (!logged) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0f0f0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial",
          padding: "30px",
        }}
      >
        <div
          style={{
            background: "#f8f5ef",
            padding: "40px",
            borderRadius: "28px",
            width: "100%",
            maxWidth: "420px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
          <h1 style={{ marginBottom: "10px", fontSize: "34px" }}>
            Afrikanitas Studio
          </h1>

          <p style={{ marginBottom: "25px", color: "#555" }}>
            Acesso privado ao painel administrativo.
          </p>

          <input
            type="password"
            placeholder="Senha de administrador"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "16px",
              border: "1px solid #ccc",
              marginBottom: "18px",
              fontSize: "16px",
            }}
          />

          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "30px",
              border: "none",
              background: "#111",
              color: "#fff",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Entrar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8f5ef",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <header style={{ marginBottom: "35px" }}>
        <h1 style={{ fontSize: "48px", marginBottom: "8px" }}>
          Admin Afrikanitas Studio
        </h1>

        <p style={{ color: "#555", fontSize: "18px" }}>
          Gerir links, clientes e fotografias selecionadas.
        </p>

        <button
          onClick={() => {
            localStorage.removeItem("afrikanitas_admin");
            setLogged(false);
          }}
          style={{
            marginTop: "15px",
            padding: "10px 20px",
            borderRadius: "20px",
            border: "none",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </header>

      <section
        style={{
          background: "#fff",
          padding: "28px",
          borderRadius: "26px",
          marginBottom: "35px",
          boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>Gerador de link da cliente</h2>

        <input
          type="text"
          placeholder="Nome da cliente"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "460px",
            padding: "15px",
            borderRadius: "16px",
            border: "1px solid #ccc",
            fontSize: "16px",
            marginBottom: "15px",
            display: "block",
          }}
        />

        <input
          type="text"
          placeholder="WhatsApp da cliente. Ex: 244923000000"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "460px",
            padding: "15px",
            borderRadius: "16px",
            border: "1px solid #ccc",
            fontSize: "16px",
            marginBottom: "15px",
            display: "block",
          }}
        />

        {clientLink && (
          <p style={{ wordBreak: "break-all", marginBottom: "15px" }}>
            <strong>Link:</strong> {clientLink}
          </p>
        )}

        <button
          onClick={copyLink}
          style={{
            padding: "14px 24px",
            borderRadius: "30px",
            border: "none",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
            marginRight: "10px",
          }}
        >
          {copied ? "Link copiado" : "Copiar link"}
        </button>

        {whatsappLink && (
          <a href={whatsappLink} target="_blank">
            <button
              style={{
                padding: "14px 24px",
                borderRadius: "30px",
                border: "none",
                background: "#25D366",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Enviar no WhatsApp
            </button>
          </a>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: "32px", marginBottom: "25px" }}>
          Seleções por cliente
        </h2>

        {Object.keys(groupedSelections).length === 0 && (
          <p>Ainda não há seleções.</p>
        )}

        <div style={{ display: "grid", gap: "28px" }}>
          {Object.entries(groupedSelections).map(([client, photos]) => (
            <div
              key={client}
              style={{
                background: "#fff",
                padding: "26px",
                borderRadius: "26px",
                boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
              }}
            >
              <h3 style={{ fontSize: "26px", marginBottom: "10px" }}>
                {client}
              </h3>

              <p style={{ color: "#555", marginBottom: "18px" }}>
                {photos.length} fotografia(s) selecionada(s)
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "18px",
                }}
              >
                {photos.map((item) => (
                  <div key={item.id}>
                    {item.photo_name && (
                      <img
                        src={item.photo_name}
                        alt={item.photo_name}
                        style={{
                          width: "100%",
                          height: "220px",
                          objectFit: "cover",
                          borderRadius: "18px",
                          marginBottom: "10px",
                        }}
                      />
                    )}

                    <p
                      style={{
                        fontSize: "13px",
                        wordBreak: "break-all",
                        color: "#444",
                      }}
                    >
                      {item.photo_name}
                    </p>

                    <p style={{ fontSize: "12px", color: "#777" }}>
                      {new Date(item.created_at).toLocaleString()}
                    </p>
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