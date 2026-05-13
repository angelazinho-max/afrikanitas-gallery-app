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
  const [clientName, setClientName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [copied, setCopied] = useState(false);
  const [selections, setSelections] = useState<Selection[]>([]);

  useEffect(() => {
    fetchSelections();
  }, []);

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

  const clientLink =
    typeof window !== "undefined" && cleanClientName
      ? `${window.location.origin}/?cliente=${cleanClientName}`
      : "";

  const whatsappText = encodeURIComponent(
    `Olá ${clientName}, segue o link para escolher as suas fotografias favoritas do Afrikanitas Studio:\n\n${clientLink}`
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

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const groupedSelections = useMemo(() => {
    const groups: Record<string, Selection[]> = {};

    selections.forEach((item) => {
      const name = item.client_name || "Cliente sem nome";

      if (!groups[name]) {
        groups[name] = [];
      }

      groups[name].push(item);
    });

    return groups;
  }, [selections]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "Arial",
        background: "#f8f5ef",
      }}
    >
      <h1 style={{ fontSize: "46px", marginBottom: "10px" }}>
        Admin Afrikanitas Studio
      </h1>

      <p style={{ fontSize: "18px", marginBottom: "35px", color: "#555" }}>
        Gerir links, clientes e fotografias escolhidas.
      </p>

      <section
        style={{
          background: "#fff",
          padding: "28px",
          borderRadius: "26px",
          marginBottom: "40px",
          boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginBottom: "18px" }}>Gerar link da cliente</h2>

        <input
          type="text"
          placeholder="Nome da cliente"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "450px",
            padding: "15px",
            borderRadius: "16px",
            border: "1px solid #ccc",
            fontSize: "16px",
            display: "block",
            marginBottom: "14px",
          }}
        />

        <input
          type="text"
          placeholder="WhatsApp da cliente. Ex: 244923000000"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "450px",
            padding: "15px",
            borderRadius: "16px",
            border: "1px solid #ccc",
            fontSize: "16px",
            display: "block",
            marginBottom: "18px",
          }}
        />

        {clientLink && (
          <p style={{ wordBreak: "break-all", marginBottom: "18px" }}>
            <strong>Link:</strong> {clientLink}
          </p>
        )}

        <button
          onClick={copyLink}
          style={{
            padding: "14px 24px",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: "30px",
            cursor: "pointer",
            fontSize: "16px",
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
                background: "#25D366",
                color: "#fff",
                border: "none",
                borderRadius: "30px",
                cursor: "pointer",
                fontSize: "16px",
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