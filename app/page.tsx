"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function Home() {
  const [cliente, setCliente] = useState("Cliente sem nome");
  const [selected, setSelected] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCliente(params.get("cliente") || "Cliente sem nome");
  }, []);

  const photos = [
    "/6A9A8879.jpg",
    "/6A9A8806.jpg",
    "/6A9A8829.jpg",
    "/6A9A8832.jpg",
  ];

  const togglePhoto = (photo: string) => {
    setSuccess(false);
    setSelected((prev) =>
      prev.includes(photo)
        ? prev.filter((p) => p !== photo)
        : [...prev, photo]
    );
  };

  const sendSelection = async () => {
    if (selected.length === 0) {
      alert("Selecione pelo menos uma foto.");
      return;
    }

    setLoading(true);

    for (const photo of selected) {
      const { error } = await supabase.from("selections").insert({
        client_name: cliente,
        photo_name: photo,
      });

      if (error) {
        setLoading(false);
        alert("Erro ao enviar: " + error.message);
        return;
      }
    }

    setLoading(false);
    setSuccess(true);
  };

  return (
    <main
      style={{
        padding: "40px",
        fontFamily: "Arial",
        background: "#f8f5ef",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "52px", marginBottom: "20px" }}>
        Afrikanitas Studio
      </h1>

      <p style={{ fontSize: "18px" }}>
        Cliente: <strong>{cliente}</strong>
      </p>

      <p style={{ fontSize: "18px" }}>
        Escolha as suas fotografias favoritas.
      </p>

      <p style={{ fontSize: "16px", color: "#555" }}>
        {selected.length} fotografia(s) selecionada(s)
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "22px",
          marginTop: "35px",
        }}
      >
        {photos.map((photo) => (
          <div
            key={photo}
            style={{
              position: "relative",
              borderRadius: "18px",
              overflow: "hidden",
              background: "#eee",
            }}
          >
            <img
              src={photo}
              alt="Fotografia"
              onClick={() => togglePhoto(photo)}
              style={{
                width: "100%",
                height: "300px",
                objectFit: "cover",
                borderRadius: "18px",
                cursor: "pointer",
                display: "block",
              }}
            />

            {selected.includes(photo) && (
              <div
                style={{
                  position: "absolute",
                  bottom: "12px",
                  right: "12px",
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.75)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "15px",
                }}
              >
                ♥
              </div>
            )}
          </div>
        ))}
      </div>

      {success && (
        <p style={{ marginTop: "25px", fontSize: "18px" }}>
          Seleção enviada com sucesso. Obrigada por escolher o Afrikanitas
          Studio ✨
        </p>
      )}

      <button
        onClick={sendSelection}
        disabled={loading}
        style={{
          marginTop: "30px",
          padding: "15px 32px",
          background: loading ? "#555" : "#111",
          color: "#fff",
          border: "none",
          borderRadius: "40px",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "16px",
        }}
      >
        {loading ? "A enviar..." : "Enviar Seleção"}
      </button>
    </main>
  );
}