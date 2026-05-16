"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";

type Photo = {
  name: string;
  url: string;
};

type SessionStatus =
  | "escolher_fotografias"
  | "aguardando_edicao"
  | "fotos_disponiveis"
  | "encerrado";

const PHOTOS_PER_LOAD = 20;

export default function Home() {
  const [cliente, setCliente] = useState("Cliente sem nome");
  const [status, setStatus] = useState<SessionStatus>("escolher_fotografias");

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [editedPhotos, setEditedPhotos] = useState<Photo[]>([]);
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
    initClient(clientFromUrl);
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
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

  const initClient = async (clientName: string) => {
    setLoadingPhotos(true);

    const cleanName = normalizeName(clientName);

    const { data: session } = await supabase
      .from("client_sessions")
      .select("*")
      .eq("client_name", cleanName)
      .maybeSingle();

    let currentStatus: SessionStatus = "escolher_fotografias";

    if (session?.status) {
      currentStatus = session.status as SessionStatus;
    } else {
      await supabase.from("client_sessions").upsert({
        client_name: cleanName,
        status: "escolher_fotografias",
        downloaded_at: null,
        updated_at: new Date().toISOString(),
      });
    }

    setStatus(currentStatus);

    if (
      currentStatus === "fotos_disponiveis" ||
      currentStatus === "encerrado"
    ) {
      await fetchEditedPhotos(cleanName);
    } else {
      await fetchPreviewPhotos(cleanName);
    }

    setLoadingPhotos(false);
  };

  const fetchPreviewPhotos = async (clientName: string) => {
    setVisibleCount(PHOTOS_PER_LOAD);

    const { data, error } = await supabase.storage
      .from("photos")
      .list(`${clientName}/previews`, {
        limit: 1000,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.log(error.message);
      setPhotos([]);
      return;
    }

    const files =
      data?.filter(
        (file) =>
          file.name !== ".emptyFolderPlaceholder" && !file.name.startsWith(".")
      ) || [];

    const photoList: Photo[] = await Promise.all(
      files.map(async (file) => {
        const fullPath = `${clientName}/previews/${file.name}`;

        const { data: signedUrl } = await supabase.storage
          .from("photos")
          .createSignedUrl(fullPath, 60 * 60);

        return {
          name: file.name,
          url: signedUrl?.signedUrl || "",
        };
      })
    );

    setPhotos(photoList);
  };

  const fetchEditedPhotos = async (clientName: string) => {
    const { data, error } = await supabase.storage
      .from("photos")
      .list(`${clientName}/edited`, {
        limit: 1000,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.log(error.message);
      setEditedPhotos([]);
      return;
    }

    const files =
      data?.filter(
        (file) =>
          file.name !== ".emptyFolderPlaceholder" && !file.name.startsWith(".")
      ) || [];

    const photoList: Photo[] = await Promise.all(
      files.map(async (file) => {
        const fullPath = `${clientName}/edited/${file.name}`;

        const { data: signedUrl } = await supabase.storage
          .from("photos")
          .createSignedUrl(fullPath, 60 * 60);

        return {
          name: file.name,
          url: signedUrl?.signedUrl || "",
        };
      })
    );

    setEditedPhotos(photoList);
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

    const cleanName = normalizeName(cliente);

    const rows = selected.map((photo) => ({
      client_name: cleanName,
      photo_name: photo,
    }));

    const { error } = await supabase.from("selections").insert(rows);

    if (error) {
      alert("Erro ao enviar: " + error.message);
      setLoading(false);
      return;
    }

    await supabase.from("client_sessions").upsert({
      client_name: cleanName,
      status: "aguardando_edicao",
      downloaded_at: null,
      updated_at: new Date().toISOString(),
    });

    setStatus("aguardando_edicao");
    setLoading(false);
    setSuccess(true);
  };

  const markAsDownloaded = async () => {
    const cleanName = normalizeName(cliente);

    await supabase
      .from("client_sessions")
      .update({
        status: "encerrado",
        downloaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("client_name", cleanName);

    setStatus("encerrado");
  };

  const downloadAll = async () => {
    for (const photo of editedPhotos) {
      const link = document.createElement("a");
      link.href = photo.url;
      link.download = photo.name;
      link.target = "_blank";
      link.click();
    }

    await markAsDownloaded();
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

  if (loadingPhotos) {
    return (
      <main style={page}>
        <p style={loadingText}>A carregar sessão...</p>
      </main>
    );
  }

  if (status === "aguardando_edicao") {
    return (
      <main style={page}>
        <section style={hero}>
          <p style={smallTitle}>Afrikanitas Studio</p>
          <h1 style={title}>Aguardando edição</h1>
          <p style={intro}>
            As suas fotografias foram recebidas com sucesso. Agora a nossa
            equipa vai preparar a sua sessão com cuidado.
          </p>
        </section>
      </main>
    );
  }

  if (status === "fotos_disponiveis" || status === "encerrado") {
    return (
      <main style={page}>
        <section style={hero}>
          <p style={smallTitle}>Afrikanitas Studio</p>
          <h1 style={title}>Fotos disponíveis para baixar</h1>
          <p style={intro}>
            A sua galeria final está pronta. Pode baixar as suas fotografias
            editadas.
          </p>

          {editedPhotos.length > 0 && (
            <button onClick={downloadAll} style={button}>
              Baixar fotografias
            </button>
          )}
        </section>

        <section style={grid}>
          {editedPhotos.map((photo) => (
            <a key={photo.url} href={photo.url} target="_blank">
              <img src={photo.url} alt={photo.name} style={photoImage} />
            </a>
          ))}
        </section>
      </main>
    );
  }

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

        {photos.length > 0 && (
          <p style={progressText}>
            A mostrar {visiblePhotos.length} de {photos.length} fotografias
          </p>
        )}
      </section>

      {photos.length === 0 && (
        <p style={emptyText}>Nenhuma fotografia encontrada.</p>
      )}

      {photos.length > 0 && (
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
  fontSize: "42px",
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
  borderRadius: "12px",
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