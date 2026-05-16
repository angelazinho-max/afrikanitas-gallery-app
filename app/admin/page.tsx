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
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [clientName, setClientName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [copied, setCopied] = useState(false);

  const [selections, setSelections] = useState<Selection[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const [activePhotos, setActivePhotos] = useState<Selection[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [favoritePhotos, setFavoritePhotos] = useState<string[]>([]);

  const cleanClientName = clientName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://galeria.afrikanitasstudio.com";

  const expiresAt = Date.now() + 72 * 60 * 60 * 1000;

  const clientLink = cleanClientName
    ? `${SITE_URL}/?cliente=${cleanClientName}&exp=${expiresAt}`
    : "";

  useEffect(() => {
    const savedFavorites = localStorage.getItem("favoritePhotos");

    if (savedFavorites) {
      setFavoritePhotos(JSON.parse(savedFavorites));
    }

    checkSession();
  }, []);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("new-selections")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "selections",
        },
        () => fetchSelections()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const checkSession = async () => {
    const { data } = await supabase.auth.getSession();

    setSession(data.session);
    setLoading(false);

    if (data.session) {
      await fetchSelections();
    }
  };

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Email ou senha incorretos.");
      return;
    }

    checkSession();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const fetchSelections = async () => {
    const { data, error } = await supabase
      .from("selections")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error.message);
      return;
    }

    setSelections((data || []) as Selection[]);
  };

  const uploadPhotos = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (!files || files.length === 0) return;

    if (!cleanClientName) {
      alert("Escreva o nome da cliente antes de carregar as fotografias.");
      return;
    }

    setUploading(true);
    setUploadMessage("");
    setUploadProgress("");

    try {
      const allFiles = Array.from(files);

      const batchSize = 10;

      let uploadedCount = 0;

      for (let i = 0; i < allFiles.length; i += batchSize) {
        const batch = allFiles.slice(i, i + batchSize);

        setUploadProgress(
          `A processar ${uploadedCount + 1} até ${Math.min(
            uploadedCount + batch.length,
            allFiles.length
          )} de ${allFiles.length} fotografias...`
        );

        const formData = new FormData();

        formData.append("cliente", cleanClientName);

        batch.forEach((file) => {
          formData.append("files", file);
        });

        const response = await fetch("/api/upload-photos", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          alert(result.error || "Erro ao carregar fotografias.");
          return;
        }

        uploadedCount += batch.length;

        setUploadProgress(
          `Processadas ${uploadedCount} de ${allFiles.length} fotografias...`
        );
      }

      setUploadMessage(
        `${allFiles.length} fotografia(s) carregada(s) e otimizadas com sucesso.`
      );

      setUploadProgress("");

      event.target.value = "";
    } catch (error) {
      console.log(error);

      alert("Erro ao carregar fotografias.");
    } finally {
      setUploading(false);
    }
  };

  const deleteClient = async (client: string) => {
    const ok = confirm(
      `Tem certeza que deseja apagar a cliente "${client}"?`
    );

    if (!ok) return;

    const { data: originalFiles } = await supabase.storage
      .from("photos")
      .list(`${client}/originals`, {
        limit: 1000,
      });

    const { data: previewFiles } = await supabase.storage
      .from("photos")
      .list(`${client}/previews`, {
        limit: 1000,
      });

    const paths: string[] = [];

    originalFiles?.forEach((file) => {
      paths.push(`${client}/originals/${file.name}`);
    });

    previewFiles?.forEach((file) => {
      paths.push(`${client}/previews/${file.name}`);
    });

    if (paths.length > 0) {
      await supabase.storage.from("photos").remove(paths);
    }

    await supabase
      .from("selections")
      .delete()
      .eq("client_name", client);

    setSelections((prev) =>
      prev.filter((item) => item.client_name !== client)
    );

    alert("Cliente apagada com sucesso.");
  };

  const getCleanPhotoName = (photoUrl: string) => {
    const decoded = decodeURIComponent(photoUrl);

    const fileName =
      decoded.split("/").pop()?.split("?")[0] || "";

    return fileName.replace(/\.webp$/i, "");
  };

  const convertToRawName = (photoUrl: string) => {
    const cleanName = getCleanPhotoName(photoUrl);

    return cleanName.replace(
      /\.(jpg|jpeg|png)$/i,
      ".CR3"
    );
  };

  const exportRawNames = (
    client: string,
    photos: Selection[]
  ) => {
    const rawNames = photos.map((photo) =>
      convertToRawName(photo.photo_name)
    );

    const content = rawNames.join("\n");

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `${client}-fotos-raw.txt`;

    link.click();

    URL.revokeObjectURL(url);
  };

  const openPhoto = (
    photos: Selection[],
    index: number
  ) => {
    setActivePhotos(photos);
    setActiveIndex(index);
  };

  const closePhoto = () => {
    setActivePhotos([]);
    setActiveIndex(null);
  };

  const nextPhoto = () => {
    if (activeIndex === null) return;

    setActiveIndex(
      (activeIndex + 1) % activePhotos.length
    );
  };

  const previousPhoto = () => {
    if (activeIndex === null) return;

    setActiveIndex(
      activeIndex === 0
        ? activePhotos.length - 1
        : activeIndex - 1
    );
  };

  const toggleFavorite = (photo: string) => {
    const updated = favoritePhotos.includes(photo)
      ? favoritePhotos.filter((item) => item !== photo)
      : [...favoritePhotos, photo];

    setFavoritePhotos(updated);

    localStorage.setItem(
      "favoritePhotos",
      JSON.stringify(updated)
    );
  };

  const whatsappText = encodeURIComponent(
    `Olá ${clientName}, tudo bem? 😃

A sua galeria Afrikanitas Studio já está pronta.

Escolha as suas fotografias favoritas através do link abaixo:

${clientLink}

As fotografias escolhidas serão editadas com todo o cuidado pela nossa equipa.

Com carinho,
Afrikanitas Studio`
  );

  const whatsappLink =
    whatsapp.trim() && clientLink
      ? `https://wa.me/${whatsapp.replace(
          /\D/g,
          ""
        )}?text=${whatsappText}`
      : "";

  const copyLink = async () => {
    if (!clientLink) {
      alert("Escreva o nome da cliente.");
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
      const name =
        item.client_name || "cliente-sem-nome";

      if (!groups[name]) {
        groups[name] = [];
      }

      groups[name].push(item);
    });

    return groups;
  }, [selections]);

  const filteredGroups = useMemo(() => {
    return Object.entries(groupedSelections).filter(
      ([client]) =>
        client
          .toLowerCase()
          .includes(filter.toLowerCase())
    );
  }, [groupedSelections, filter]);

  const totalClients =
    Object.keys(groupedSelections).length;

  const totalPhotos = selections.length;

  const activePhoto =
    activeIndex !== null
      ? activePhotos[activeIndex]
      : null;

  if (loading) {
    return (
      <main style={styles.loadingPage}>
        A carregar Afrikanitas Studio...
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <h1>Admin atualizado com previews automáticos ✅</h1>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    fontFamily:
      "Georgia, 'Times New Roman', serif",
    background:
      "linear-gradient(135deg, #f8f1e7, #efe0cb)",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};