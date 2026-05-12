"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Selection = {
  id: string;
  client_name: string;
  photo_name: string;
  created_at: string;
};

export default function AdminPage() {
  const [selections, setSelections] = useState<Selection[]>([]);
const [clientName, setClientName] = useState("");
  useEffect(() => {
    const fetchSelections = async () => {
      const { data, error } = await supabase
        .from("selections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.log(error);
        return;
      }

      setSelections(data || []);
    };

    fetchSelections();
  }, []);

  return (
    <main
      style={{
        padding: "40px",
        fontFamily: "Arial",
        background: "#f8f5ef",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "42px" }}>
        Admin Afrikanitas Studio
      </h1>

      <p style={{ marginBottom: "30px" }}>
        Fotos escolhidas pelos clientes.
      </p>
<div
  style={{
    background: "#fff",
    padding: "20px",
    borderRadius: "18px",
    marginBottom: "30px",
  }}
>
  <h2>Gerar link da cliente</h2>

  <input
    type="text"
    placeholder="Nome da cliente"
    value={clientName}
    onChange={(e) => setClientName(e.target.value)}
    style={{
      padding: "12px",
      width: "100%",
      maxWidth: "400px",
      borderRadius: "10px",
      border: "1px solid #ccc",
      marginBottom: "12px",
    }}
  />

 {clientName && (
  <div>
    <p>
      Link:{" "}
      <strong>
`https://afrikanitas-gallery-3d68mcc4a-afrikanitas-studio-s-projects.vercel.app/?cliente=${clientName.toLowerCase()}`
      </strong>
    </p>

    <button
      onClick={() =>
        navigator.clipboard.writeText(
`https://afrikanitas-gallery-3d68mcc4a-afrikanitas-studio-s-projects.vercel.app/?cliente=${clientName.toLowerCase()}`
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
</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
        }}
      >
        {selections.map((item) => (
          <div
            key={item.id}
            style={{
              background: "#fff",
              padding: "16px",
              borderRadius: "18px",
            }}
          >
            <img
              src={item.photo_name}
              style={{
                width: "100%",
                height: "260px",
                objectFit: "cover",
                borderRadius: "14px",
                marginBottom: "12px",
              }}
            />

            <strong>Cliente:</strong> {item.client_name}

            <br />
            <br />

            <strong>Foto:</strong>

            <p
              style={{
                fontSize: "12px",
                wordBreak: "break-all",
              }}
            >
              {item.photo_name}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}