"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "./lib/supabase";

function GalleryContent() {
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
    if (selected.includes(photo)) {
      setSelected(selected.filter((p) => p !== photo));
    } else {
      setSelected([...selected, photo]);
    }
  };

  const saveSelection = async () => {
    setLoading(true);

    for (const photo of selected) {
      await supabase.from("selections").insert({
        client_name: cliente,
        photo_name: photo,
      });
    }

    setLoading(false);
    setSuccess(true);
  };

  return (
    <main
      style={{
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <h1>Afrikanitas Studio</h1>

      <p>
        <strong>Cliente:</strong> {cliente}
      </p>

      <p>Escolha as suas fotografias favoritas.</p>

      <p>{selected.length} fotografia(s) selecionada(s)</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        {photos.map((photo) => (
          <div key={photo}>
            <img
              src={photo}
              alt={photo}
              onClick={() => togglePhoto(photo)}
              style={{
                width: "100%",
                borderRadius: "20px",
                cursor: "pointer",
                border: selected.includes(photo)
                  ? "5px solid black"
                  : "2px solid #ddd",
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={saveSelection}
        disabled={loading}
        style={{
          marginTop: "30px",
          padding: "14px 24px",
          background: "black",
          color: "white",
          border: "none",
          borderRadius: "16px",
          cursor: "pointer",
        }}
      >
        {loading ? "A guardar..." : "Confirmar seleção"}
      </button>

      {success && (
        <p style={{ marginTop: "20px", color: "green" }}>
          Fotografias enviadas com sucesso.
        </p>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<p>A carregar...</p>}>
      <GalleryContent />
    </Suspense>
  );
}