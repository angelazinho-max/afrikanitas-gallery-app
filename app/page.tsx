"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "./lib/supabase";

export default function Home() {
  const searchParams = useSearchParams();
  const cliente = searchParams.get("cliente") || "Cliente sem nome";

  const [selected, setSelected] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const photos = [
    "/6A9A8879.jpg",
    "/6A9A8806.jpg",
    "/6A9A8829.jpg",
    "/6A9A8832.jpg",
  ];

  const togglePhoto = (photo: string) => {
    setSuccess(false);

    if (selected.includes(photo)) {
      setSelected(selected.filter((p) => p !== photo));
    } else {
      setSelected([...selected, photo]);
    }
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
        color: "#111",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "52px",
            marginBottom: "10px",
            letterSpacing: "-1px",
          }}
        >
          Afrikanitas Studio
        </h1>

        <p
          style={{
            fontSize: "18px",
            marginBottom: "10px",
          }}
        >
          Cliente: <strong>{cliente}</strong>
        </p>

        <p
          style={{
            fontSize: "18px",
            marginBottom: "10px",
          }}
        >
          Escolha as suas fotografias favoritas.
        </p>

        <p
          style={{
            fontSize: "16px",
            marginBottom: "35px",
            color: "#555",
          }}
        >
          {selected.length} fotografia(s) selecionada(s)
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "22px",
          }}
        >
          {photos.map((photo) => (
            <div
              key={photo}
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "18px",
                background: "#eee",
              }}
            >
              <img
                src={photo}
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
                    background: "rgba(0, 0, 0, 0.75)",
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
          <p
            style={{
              marginTop: "25px",
              marginBottom: "20px",
              fontSize: "18px",
              color: "#111",
            }}
          >
            Seleção enviada com sucesso. Obrigada por escolher o Afrikanitas
            _Studio ✨
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
      </div>
    </main>
  );
}