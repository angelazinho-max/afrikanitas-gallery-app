"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Photo = {
  name: string;
  url: string;
};

export default function Home() {
  const [cliente, setCliente] = useState("Cliente sem nome");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCliente(params.get("cliente") || "Cliente sem nome");
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoadingPhotos(true);

    const { data, error } = await supabase.storage
      .from("photos")
      .list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.log("Erro ao buscar fotos:", error.message);
      setLoadingPhotos(false);
      return;
    }

    const photoList: Photo[] =
      data
        ?.filter((file) => {
          return (
            file.name !== ".emptyFolderPlaceholder" &&
            !file.name.startsWith(".")
          );
        })
        .map((file) => {
          const { data: publicUrl } = supabase.storage
            .from("photos")
            .getPublicUrl(file.name);

          return {
            name: file.name,
            url: publicUrl.publicUrl,
          };
        }) || [];

    setPhotos(photoList);
    setLoadingPhotos(false);
  };

  const togglePhoto = (photoUrl: string) => {
    setSuccess(false);

    setSelected((prev) =>
      prev.includes(photoUrl)
        ? prev.filter((p) => p !== photoUrl)
        : [...prev, photoUrl]
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
    <main style={page}>
      <section style={hero}>

        <p style={smallTitle}>Galeria privada</p>

        <h1 style={title}>Afrikanitas Studio</h1>

        <p style={intro}>
          Bem-vinda à sua galeria privada Afrikanitas Studio. Cada fotografia
          foi criada para guardar com elegância a beleza deste momento. Escolha
          com calma as suas imagens favoritas; a nossa equipa irá preparar a
          seleção final com todo cuidado.
        </p>

        <p style={clientText}>
          Cliente: <strong>{cliente}</strong>
        </p>

        <p style={counter}>{selected.length} fotografia(s) selecionada(s)</p>
      </section>

      {loadingPhotos && (
        <p style={loadingText}>A carregar fotografias...</p>
      )}

      {!loadingPhotos && photos.length === 0 && (
        <p style={loadingText}>
          Ainda não há fotografias carregadas nesta galeria.
        </p>
      )}

      {!loadingPhotos && photos.length > 0 && (
        <section style={grid}>
          {photos.map((photo) => (
            <div
              key={photo.url}
              onClick={() => togglePhoto(photo.url)}
              style={{
                ...photoCard,
                border: selected.includes(photo.url)
                  ? "3px solid #111"
                  : "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <img src={photo.url} alt={photo.name} style={photoImage} />

              {selected.includes(photo.url) && (
                <div style={selectedBadge}>Selecionada</div>
              )}
            </div>
          ))}
        </section>
      )}

      {success && (
        <p style={successText}>
          Seleção enviada com sucesso. Obrigada por escolher o Afrikanitas
          Studio ✨
        </p>
      )}

      <button onClick={sendSelection} disabled={loading} style={button}>
        {loading ? "A enviar..." : "Enviar Seleção"}
      </button>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  padding: "38px",
  fontFamily: "Georgia, 'Times New Roman', serif",
  background: "linear-gradient(135deg, #f8f1e7, #ead8c0)",
};

const hero = {
  maxWidth: "860px",
  margin: "0 auto 38px",
  textAlign: "center" as const,
};

const smallTitle = {
  textTransform: "uppercase" as const,
  letterSpacing: "4px",
  fontSize: "12px",
  color: "#8b7355",
  marginBottom: "12px",
};

const title = {
  fontSize: "52px",
  marginBottom: "18px",
  fontWeight: 400,
  color: "#1c1c1c",
};

const intro = {
  fontSize: "18px",
  lineHeight: 1.7,
  color: "#5c5147",
  marginBottom: "22px",
};

const clientText = {
  fontSize: "18px",
  color: "#222",
};

const counter = {
  fontSize: "15px",
  color: "#6b5d4f",
};

const loadingText = {
  textAlign: "center" as const,
  fontSize: "18px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "22px",
  maxWidth: "1180px",
  margin: "0 auto",
};

const photoCard = {
  position: "relative" as const,
  borderRadius: "24px",
  overflow: "hidden",
  background: "#fff",
  padding: "10px",
  boxShadow: "0 16px 38px rgba(0,0,0,0.08)",
  cursor: "pointer",
};

const photoImage = {
  width: "100%",
  height: "230px",
  objectFit: "cover" as const,
  borderRadius: "18px",
  display: "block",
};

const selectedBadge = {
  position: "absolute" as const,
  bottom: "18px",
  right: "18px",
  background: "#111",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: "30px",
  fontSize: "13px",
};

const successText = {
  marginTop: "28px",
  textAlign: "center" as const,
  fontSize: "18px",
  color: "#2f5f3a",
};

const button = {
  display: "block",
  margin: "32px auto 0",
  padding: "15px 36px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: "40px",
  cursor: "pointer",
  fontSize: "16px",
};