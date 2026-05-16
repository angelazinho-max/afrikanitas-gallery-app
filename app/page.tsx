"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";

type Photo = {
  name: string;
  url: string;
};

const PHOTOS_PER_LOAD = 20;

export default function Home() {
  const [cliente, setCliente] = useState("Cliente sem nome");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PHOTOS_PER_LOAD);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientFromUrl = params.get("cliente") || "Cliente sem nome";
    setCliente(clientFromUrl);
    fetchPhotos(clientFromUrl);
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];

        if (first.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + PHOTOS_PER_LOAD, photos.length)
          );
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [photos.length]);

  const normalizeName = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");

  const fetchPhotos = async (clientName: string) => {
    setLoadingPhotos(true);
    setVisibleCount(PHOTOS_PER_LOAD);

    const namesToTry = Array.from(
      new Set([clientName, normalizeName(clientName)])
    );

    let foundPhotos: Photo[] = [];

    for (const folderName of namesToTry) {
      const { data, error } = await supabase.storage
        .from("photos")
        .list(folderName, {
          limit: 1000,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) {
        console.log("Erro ao buscar fotos:", error.message);
        continue;
      }

      const files =
        data?.filter(
          (file) =>
            file.name !== ".emptyFolderPlaceholder" &&
            !file.name.startsWith(".")
        ) || [];

      const photoList: Photo[] = await Promise.all(
        files.map(async (file) => {
          const fullPath = `${folderName}/${file.name}`;

          const { data: signedUrl } = await supabase.storage
            .from("photos")
            .createSignedUrl(fullPath, 60 * 60);

          return {
            name: file.name,
            url: signedUrl?.signedUrl || "",
          };
        })
      );

      if (photoList.length > 0) {
        foundPhotos = photoList;
        break;
      }
    }

    setPhotos(foundPhotos);
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
      alert("Selecione pelo menos uma fotografia.");
      return;
    }

    setLoading(true);

    for (const photo of selected) {
      const { error } = await supabase.from("selections").insert({
        client_name: cliente,
        photo_name: photo,
      });

      if (error) {
        alert("Erro ao enviar: " + error.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setSuccess(true);
  };

  const nextPhoto = () => {
    if (activeIndex === null) return;
    setActiveIndex((activeIndex + 1) % photos.length);
  };

  const previousPhoto = () => {
    if (activeIndex === null) return;
    setActiveIndex(activeIndex === 0 ? photos.length - 1 : activeIndex - 1);
  };

  const activePhoto = activeIndex !== null ? photos[activeIndex] : null;
  const visiblePhotos = photos.slice(0, visibleCount);
  const hasMorePhotos = visibleCount < photos.length;

  return (
    <main style={page}>
      <section style={hero}>
        <p style={smallTitle}>Galeria Privada</p>

        <h1 style={title}>Afrikanitas Studio</h1>

        <p style={intro}>
          Escolha as suas fotografias favoritas. Clique numa fotografia para
          abrir em destaque.
        </p>

        <p style={clientText}>
          Cliente: <strong>{cliente}</strong>
        </p>

        <p style={counter}>{selected.length} fotografia(s) selecionada(s)</p>

        {!loadingPhotos && photos.length > 0 && (
          <p style={progressText}>
            A mostrar {visiblePhotos.length} de {photos.length} fotografias
          </p>
        )}
      </section>

      {loadingPhotos && <p style={loadingText}>A carregar fotografias...</p>}

      {!loadingPhotos && photos.length === 0 && (
        <p style={emptyText}>Nenhuma fotografia encontrada.</p>
      )}

      {!loadingPhotos && photos.length > 0 && (
        <>
          <section style={grid}>
            {visiblePhotos.map((photo, index) => {
              const isSelected = selected.includes(photo.url);

              return (
                <div key={photo.url} style={photoCard}>
                  <button
                    onClick={() => togglePhoto(photo.url)}
                    style={{
                      ...heartButton,
                      background: isSelected ? "#111" : "rgba(255,255,255,0.9)",
                      color: isSelected ? "#fff" : "#111",
                    }}
                  >
                    ♥
                  </button>

                  <img
                    src={photo.url}
                    alt={photo.name}
                    style={photoImage}
                    onClick={() => setActiveIndex(index)}
                    loading="lazy"
                    decoding="async"
                    fetchPriority={index < 6 ? "high" : "low"}
                  />
                </div>
              );
            })}
          </section>

          <div ref={loadMoreRef} style={loadMoreArea}>
            {hasMorePhotos ? (
              <p style={loadingText}>A carregar mais fotografias...</p>
            ) : (
              <p style={emptyText}>Todas as fotografias foram carregadas.</p>
            )}
          </div>
        </>
      )}

      {success && <p style={successText}>Seleção enviada com sucesso ✨</p>}

      <button onClick={sendSelection} disabled={loading} style={button}>
        {loading ? "A enviar..." : "Enviar Seleção"}
      </button>

      {activePhoto && (
        <div style={modalOverlay} onClick={() => setActiveIndex(null)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={closeButton} onClick={() => setActiveIndex(null)}>
              ×
            </button>

            <button style={arrowLeft} onClick={previousPhoto}>
              ‹
            </button>

            <img
              src={activePhoto.url}
              alt={activePhoto.name}
              style={mainImage}
              decoding="async"
            />

            <button
              onClick={() => togglePhoto(activePhoto.url)}
              style={{
                ...modalFavoriteButton,
                background: selected.includes(activePhoto.url)
                  ? "#111"
                  : "rgba(255,255,255,0.95)",
                color: selected.includes(activePhoto.url) ? "#fff" : "#111",
              }}
            >
              {selected.includes(activePhoto.url)
                ? "♥ Selecionada"
                : "♡ Selecionar fotografia"}
            </button>

            <button style={arrowRight} onClick={nextPhoto}>
              ›
            </button>

            <div style={modalCounter}>
              {activeIndex! + 1} / {photos.length}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const page = {
  minHeight: "100vh",
  padding: "20px",
  background: "Canvas",
  color: "CanvasText",
  fontFamily: "Georgia, 'Times New Roman', serif",
  colorScheme: "light dark",
};

const hero = {
  maxWidth: "760px",
  margin: "0 auto 28px",
  textAlign: "center" as const,
};

const smallTitle = {
  textTransform: "uppercase" as const,
  letterSpacing: "6px",
  fontSize: "12px",
  color: "GrayText",
  marginBottom: "18px",
};

const title = {
  fontSize: "46px",
  marginBottom: "18px",
  fontWeight: 400,
  color: "CanvasText",
};

const intro = {
  fontSize: "18px",
  lineHeight: 1.5,
  color: "CanvasText",
};

const clientText = {
  fontSize: "18px",
  color: "CanvasText",
};

const counter = {
  fontSize: "16px",
  color: "GrayText",
};

const progressText = {
  fontSize: "14px",
  color: "GrayText",
  marginTop: "8px",
};

const loadingText = {
  textAlign: "center" as const,
  color: "CanvasText",
};

const emptyText = {
  textAlign: "center" as const,
  color: "GrayText",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(95px, 1fr))",
  gap: "10px",
  maxWidth: "1100px",
  margin: "0 auto",
};

const photoCard = {
  position: "relative" as const,
  borderRadius: "12px",
  overflow: "hidden",
  background: "rgba(127,127,127,0.15)",
};

const photoImage = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover" as const,
  display: "block",
  cursor: "pointer",
};

const heartButton = {
  position: "absolute" as const,
  top: "7px",
  right: "7px",
  zIndex: 2,
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  border: "none",
  fontSize: "15px",
  cursor: "pointer",
};

const loadMoreArea = {
  minHeight: "80px",
  padding: "24px 0",
};

const successText = {
  textAlign: "center" as const,
  color: "#2f8b43",
  marginTop: "24px",
};

const button = {
  display: "block",
  margin: "28px auto 0",
  padding: "15px 34px",
  background: "CanvasText",
  color: "Canvas",
  border: "none",
  borderRadius: "40px",
  cursor: "pointer",
  fontSize: "16px",
};

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.92)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "14px",
};

const modalContent = {
  position: "relative" as const,
  width: "100%",
  maxWidth: "1000px",
  height: "82vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const mainImage = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain" as const,
  borderRadius: "16px",
};

const modalFavoriteButton = {
  position: "absolute" as const,
  bottom: "68px",
  left: "50%",
  transform: "translateX(-50%)",
  padding: "12px 22px",
  borderRadius: "40px",
  border: "none",
  fontSize: "15px",
  cursor: "pointer",
  fontWeight: 500,
  backdropFilter: "blur(10px)",
  whiteSpace: "nowrap" as const,
};

const closeButton = {
  position: "absolute" as const,
  top: "10px",
  right: "10px",
  background: "transparent",
  color: "#fff",
  border: "none",
  fontSize: "42px",
  cursor: "pointer",
};

const arrowLeft = {
  position: "absolute" as const,
  left: "10px",
  top: "50%",
  transform: "translateY(-50%)",
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: "40px",
  cursor: "pointer",
};

const arrowRight = {
  position: "absolute" as const,
  right: "10px",
  top: "50%",
  transform: "translateY(-50%)",
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: "40px",
  cursor: "pointer",
};

const modalCounter = {
  position: "absolute" as const,
  bottom: "16px",
  left: "50%",
  transform: "translateX(-50%)",
  color: "#fff",
  background: "rgba(0,0,0,0.5)",
  padding: "8px 14px",
  borderRadius: "20px",
};