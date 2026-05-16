"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Selection = {
  id: string;
  client_name: string;
  photo_name: string;
  created_at: string;
};

type ClientSession = {
  client_name: string;
  status: string;
  downloaded_at: string | null;
  updated_at: string;
};

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [clientName, setClientName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [copied, setCopied] = useState(false);

  const [selections, setSelections] = useState<Selection[]>([]);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [filter, setFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadingFinalClient, setUploadingFinalClient] = useState("");

  const cleanClientName = clientName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://galeria.afrikanitasstudio.com";

  const clientLink = cleanClientName
    ? `${SITE_URL}/?cliente=${cleanClientName}`
    : "";

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "selections" },
        () => fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_sessions" },
        () => fetchAll()
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

    if (data.session) await fetchAll();
  };

  const fetchAll = async () => {
    await Promise.all([fetchSelections(), fetchSessions()]);
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

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from("client_sessions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.log(error.message);
      return;
    }

    setSessions((data || []) as ClientSession[]);
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

  const getClientLink = (client: string) => {
    return `${SITE_URL}/?cliente=${client}`;
  };

  const getPhotoSrc = (photoName: string) => {
    if (!photoName) return "";

    if (photoName.startsWith("http")) {
      return photoName;
    }

    const cleanPath = photoName.replace(/^\/+/, "");

    const { data } = supabase.storage.from("photos").getPublicUrl(cleanPath);

    return data.publicUrl;
  };

  const getSession = (client: string) => {
    return sessions.find((item) => item.client_name === client);
  };

  const getSessionStatus = (client: string) => {
    const current = getSession(client);

    if (!current) return "Aguardando seleção";

    if (current.status === "escolher_fotografias") return "Aguardando seleção";
    if (current.status === "aguardando_edicao") return "Aguardando edição";
    if (current.status === "fotos_disponiveis") return "Fotos prontas para baixar";
    if (current.status === "encerrado") return "Sessão encerrada";

    return current.status;
  };

  const getProgress = (client: string) => {
    const current = getSession(client);

    if (!current) return 25;
    if (current.status === "escolher_fotografias") return 25;
    if (current.status === "aguardando_edicao") return 55;
    if (current.status === "fotos_disponiveis") return 85;
    if (current.status === "encerrado") return 100;

    return 25;
  };

  const markAsReady = async (client: string) => {
    await supabase.from("client_sessions").upsert({
      client_name: client,
      status: "fotos_disponiveis",
      downloaded_at: null,
      updated_at: new Date().toISOString(),
    });

    await fetchAll();
    alert("Cliente marcada como fotos prontas para baixar.");
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.readAsDataURL(file);

      reader.onload = (event) => {
        if (!event.target?.result) {
          reject();
          return;
        }

        img.src = event.target.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1600;
        const scale = maxWidth / img.width;

        canvas.width = img.width > maxWidth ? maxWidth : img.width;
        canvas.height = img.width > maxWidth ? img.height * scale : img.height;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject();
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject();
              return;
            }

            resolve(blob);
          },
          "image/webp",
          0.72
        );
      };

      img.onerror = reject;
    });
  };

  const removeStorageFolder = async (client: string, folder: string) => {
    const { data: files } = await supabase.storage
      .from("photos")
      .list(`${client}/${folder}`, { limit: 1000 });

    if (files && files.length > 0) {
      const paths = files.map((file) => `${client}/${folder}/${file.name}`);
      await supabase.storage.from("photos").remove(paths);
    }
  };

  const uploadPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      await removeStorageFolder(cleanClientName, "previews");
      await removeStorageFolder(cleanClientName, "edited");

      await supabase
        .from("selections")
        .delete()
        .eq("client_name", cleanClientName);

      await supabase.from("client_sessions").upsert({
        client_name: cleanClientName,
        status: "escolher_fotografias",
        downloaded_at: null,
        updated_at: new Date().toISOString(),
      });

      const allFiles = Array.from(files);

      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];

        setUploadProgress(
          `A carregar ${i + 1} de ${allFiles.length} fotografias...`
        );

        const compressedFile = await compressImage(file);
        const safeName = file.name
          .replace(/\s+/g, "-")
          .replace(/[^\w.-]/g, "")
          .toLowerCase();

        const previewPath = `${cleanClientName}/previews/${safeName}.webp`;

        const { error } = await supabase.storage
          .from("photos")
          .upload(previewPath, compressedFile, {
            cacheControl: "31536000",
            upsert: true,
            contentType: "image/webp",
          });

        if (error) {
          alert(error.message);
          return;
        }

        setUploadProgress(`${i + 1} de ${allFiles.length} fotografias carregadas`);
      }

      setUploadMessage("Fotografias carregadas com sucesso.");
      setUploadProgress("");
      event.target.value = "";

      await fetchAll();
    } catch (error) {
      console.log(error);
      alert("Erro ao carregar fotografias.");
    } finally {
      setUploading(false);
    }
  };

  const uploadEditedPhotosForClient = async (
    client: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (!files || files.length === 0) return;

    setUploadingFinalClient(client);

    try {
      await removeStorageFolder(client, "edited");

      const allFiles = Array.from(files);

      for (const file of allFiles) {
        const safeName = file.name
          .replace(/\s+/g, "-")
          .replace(/[^\w.-]/g, "")
          .toLowerCase();

        const path = `${client}/edited/${safeName}`;

        const { error } = await supabase.storage.from("photos").upload(path, file, {
          cacheControl: "31536000",
          upsert: true,
          contentType: file.type || "image/jpeg",
        });

        if (error) {
          alert(error.message);
          return;
        }
      }

      await supabase.from("client_sessions").upsert({
        client_name: client,
        status: "fotos_disponiveis",
        downloaded_at: null,
        updated_at: new Date().toISOString(),
      });

      event.target.value = "";
      await fetchAll();

      alert("Fotos editadas carregadas. A cliente já pode baixar no mesmo link.");
    } catch (error) {
      console.log(error);
      alert("Erro ao carregar fotos editadas.");
    } finally {
      setUploadingFinalClient("");
    }
  };

  const closeSession = async (client: string) => {
    const ok = confirm(`Deseja encerrar a sessão de "${client}"?`);
    if (!ok) return;

    await supabase
      .from("client_sessions")
      .update({
        status: "encerrado",
        downloaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("client_name", client);

    await fetchAll();
    alert("Sessão encerrada.");
  };

  const deleteClient = async (client: string) => {
    const ok = confirm(`Tem certeza que deseja apagar a cliente "${client}"?`);
    if (!ok) return;

    await removeStorageFolder(client, "previews");
    await removeStorageFolder(client, "edited");

    await supabase.from("selections").delete().eq("client_name", client);
    await supabase.from("client_sessions").delete().eq("client_name", client);

    await fetchAll();

    alert("Cliente apagada com sucesso.");
  };

  const getCleanPhotoName = (photoUrl: string) => {
    const decoded = decodeURIComponent(photoUrl);
    const fileName = decoded.split("/").pop()?.split("?")[0] || "";

    return fileName.replace(/\.webp$/i, "");
  };

  const convertToRawName = (photoUrl: string) => {
    const cleanName = getCleanPhotoName(photoUrl);
    return cleanName.replace(/\.(jpg|jpeg|png|webp)$/i, ".CR3");
  };

  const exportRawNames = (client: string, photos: Selection[]) => {
    const rawNames = photos.map((photo) => convertToRawName(photo.photo_name));
    const content = rawNames.join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${client}-fotos-raw.txt`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const copyLink = async () => {
    if (!clientLink) {
      alert("Escreva o nome da cliente primeiro.");
      return;
    }

    await navigator.clipboard.writeText(clientLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappText = encodeURIComponent(
    `Olá ${clientName}, tudo bem? 😃

A sua galeria Afrikanitas Studio já está pronta.

Escolha as suas fotografias favoritas através do link abaixo:

${clientLink}

Com carinho,
Afrikanitas Studio`
  );

  const whatsappLink =
    whatsapp.trim() && clientLink
      ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${whatsappText}`
      : "";

  const getReadyWhatsappLink = (client: string) => {
    const message = encodeURIComponent(
      `Olá, tudo bem? ✨

As suas fotografias Afrikanitas Studio já estão prontas para baixar.

Pode baixar as fotos editadas no mesmo link da sua galeria:

${getClientLink(client)}

Com carinho,
Afrikanitas Studio`
    );

    return `https://wa.me/?text=${message}`;
  };

  const groupedSelections = useMemo(() => {
    const groups: Record<string, Selection[]> = {};

    selections.forEach((item) => {
      const name = item.client_name || "cliente-sem-nome";

      if (!groups[name]) groups[name] = [];

      groups[name].push(item);
    });

    return groups;
  }, [selections]);

  const filteredGroups = useMemo(() => {
    return Object.entries(groupedSelections).filter(([client]) =>
      client.toLowerCase().includes(filter.toLowerCase())
    );
  }, [groupedSelections, filter]);

  const totalClients = sessions.length;
  const totalPhotos = selections.length;

  if (loading) {
    return (
      <main style={styles.loadingPage}>A carregar Afrikanitas Studio...</main>
    );
  }

  if (!session) {
    return (
      <main style={styles.loginPage}>
        <section style={styles.loginCard}>
          <h1 style={styles.loginTitle}>Afrikanitas Studio</h1>
          <p style={styles.muted}>Área privada do administrador.</p>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <button onClick={login} style={styles.blackButton}>
            Entrar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Estúdio Afrikanitas</h1>
          <p style={styles.subtitle}>
            Painel premium de clientes, seleções e entrega final.
          </p>
        </div>

        <button onClick={logout} style={styles.logoutButton}>
          Sair
        </button>
      </header>

      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Total de sessões</p>
          <strong style={styles.statNumber}>{totalClients}</strong>
        </div>

        <div style={styles.statCard}>
          <p style={styles.statLabel}>Fotos selecionadas</p>
          <strong style={styles.statNumber}>{totalPhotos}</strong>
        </div>

        <div style={styles.statCard}>
          <p style={styles.statLabel}>Sistema</p>
          <strong style={styles.online}>On-line</strong>
        </div>
      </section>

      <section style={styles.topGrid}>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Carregar fotografias</h2>
          <p style={styles.muted}>
            Escreva o nome da cliente e carregue as fotografias.
          </p>

          <input
            type="text"
            placeholder="Nome da cliente"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            style={styles.input}
          />

          <input
            type="file"
            multiple
            accept="image/*"
            onChange={uploadPhotos}
            style={styles.input}
          />

          <p style={styles.small}>Formatos aceites: JPG, JPEG, PNG, WEBP</p>

          <button style={styles.blackButton} disabled={uploading}>
            {uploading ? "A carregar..." : "Carregar fotografias"}
          </button>

          {uploadProgress && <p style={styles.small}>{uploadProgress}</p>}
          {uploadMessage && <p style={styles.success}>{uploadMessage}</p>}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Gerar link da cliente</h2>

          <input
            type="text"
            placeholder="Nome da cliente"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            style={styles.input}
          />

          <input
            type="text"
            placeholder="WhatsApp da cliente"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            style={styles.input}
          />

          <div style={styles.linkBox}>
            <span style={styles.linkText}>
              {clientLink || "Link da galeria será gerado aqui"}
            </span>

            <button onClick={copyLink} style={styles.copyButton}>
              {copied ? "Copiado" : "Copiar link"}
            </button>
          </div>

          {whatsappLink && (
            <a href={whatsappLink} target="_blank" style={{ textDecoration: "none" }}>
              <button style={styles.whatsappButton}>Compartilhar WhatsApp</button>
            </a>
          )}
        </div>
      </section>

      <section>
        <h2 style={styles.sectionTitleBig}>Seleções por cliente</h2>

        <input
          type="text"
          placeholder="Filtrar cliente automaticamente..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={styles.searchInput}
        />

        <div style={styles.clientsList}>
          {filteredGroups.map(([client, photos]) => {
            const progress = getProgress(client);
            const status = getSessionStatus(client);

            return (
              <div key={client} style={styles.clientCard}>
                <div style={styles.clientTop}>
                  <div style={{ flex: 1 }}>
                    <h3 style={styles.clientName}>{client}</h3>

                    <p style={styles.clientCount}>
                      {photos.length} fotografia(s) selecionada(s)
                    </p>

                    <p style={styles.clientCount}>
                      Status: <strong>{status}</strong>
                    </p>

                    <div style={styles.progressArea}>
                      <div style={styles.progressTop}>
                        <span>Progresso da sessão</span>
                        <strong>{progress}%</strong>
                      </div>

                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={styles.clientActions}>
                    <button
                      onClick={() => exportRawNames(client, photos)}
                      style={styles.rawButton}
                    >
                      Exportar RAW
                    </button>

                    <label style={styles.finalButton}>
                      {uploadingFinalClient === client
                        ? "A carregar finais..."
                        : "Carregar fotos editadas"}

                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(event) =>
                          uploadEditedPhotosForClient(client, event)
                        }
                        style={{ display: "none" }}
                      />
                    </label>

                    <button
                      onClick={() => markAsReady(client)}
                      style={styles.readyButton}
                    >
                      Fotos prontas para baixar
                    </button>

                    <a
                      href={getReadyWhatsappLink(client)}
                      target="_blank"
                      style={{ textDecoration: "none" }}
                    >
                      <button style={styles.whatsappSmallButton}>
                        Avisar cliente
                      </button>
                    </a>

                    <button
                      onClick={() => closeSession(client)}
                      style={styles.closeSessionButton}
                    >
                      Encerrar sessão
                    </button>

                    <button
                      onClick={() => deleteClient(client)}
                      style={styles.deleteButton}
                    >
                      Apagar cliente
                    </button>
                  </div>
                </div>

                <div style={styles.photoGrid}>
                  {photos.map((item) => (
                    <img
                      key={item.id}
                      src={getPhotoSrc(item.photo_name)}
                      alt="Foto escolhida"
                      style={styles.thumbImage}
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    fontFamily: "Georgia, 'Times New Roman', serif",
    background: "linear-gradient(135deg, #f8f1e7, #efe0cb)",
    color: "#2b2118",
  },
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8f1e7",
    fontFamily: "Georgia, serif",
  },
  loginPage: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8f1e7, #efe0cb)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "Georgia, serif",
  },
  loginCard: {
    width: "100%",
    maxWidth: "420px",
    background: "#fffaf3",
    border: "1px solid #ddcdb8",
    borderRadius: "28px",
    padding: "32px",
    boxShadow: "0 20px 45px rgba(0,0,0,0.12)",
    textAlign: "center" as const,
  },
  header: {
    maxWidth: "1200px",
    margin: "0 auto 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },
  title: {
    fontSize: "38px",
    lineHeight: 1,
    margin: 0,
    fontWeight: 500,
  },
  loginTitle: {
    fontSize: "32px",
    marginBottom: "8px",
    fontWeight: 500,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#5f5144",
    fontSize: "15px",
  },
  muted: {
    color: "#5f5144",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  logoutButton: {
    padding: "13px 25px",
    borderRadius: "30px",
    border: "1px solid #d6c5ad",
    background: "#fffaf3",
    cursor: "pointer",
    fontSize: "15px",
  },
  statsGrid: {
    maxWidth: "1200px",
    margin: "0 auto 24px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "18px",
  },
  statCard: {
    background: "rgba(255,250,243,0.9)",
    border: "1px solid #ddcdb8",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  },
  statLabel: {
    margin: "0 0 8px",
    color: "#5f5144",
    fontSize: "14px",
  },
  statNumber: {
    fontSize: "28px",
    color: "#2b2118",
  },
  online: {
    fontSize: "20px",
    color: "#1c7c35",
  },
  topGrid: {
    maxWidth: "1200px",
    margin: "0 auto 26px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "22px",
  },
  card: {
    background: "rgba(255,250,243,0.92)",
    border: "1px solid #ddcdb8",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
  },
  sectionTitle: {
    fontSize: "22px",
    margin: "0 0 12px",
    fontWeight: 500,
  },
  sectionTitleBig: {
    maxWidth: "1200px",
    margin: "30px auto 14px",
    fontSize: "26px",
    fontWeight: 500,
  },
  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "13px 15px",
    borderRadius: "10px",
    border: "1px solid #d6c5ad",
    background: "#fffaf3",
    color: "#2b2118",
    marginBottom: "12px",
    fontSize: "14px",
    outline: "none",
  },
  searchInput: {
    width: "100%",
    maxWidth: "650px",
    display: "block",
    boxSizing: "border-box" as const,
    margin: "0 auto 18px",
    padding: "15px",
    borderRadius: "12px",
    border: "1px solid #d6c5ad",
    background: "#fffaf3",
    color: "#2b2118",
    fontSize: "15px",
    outline: "none",
  },
  small: {
    fontSize: "13px",
    color: "#5f5144",
    marginBottom: "14px",
  },
  blackButton: {
    padding: "13px 22px",
    background: "#2b1811",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
  },
  whatsappButton: {
    marginTop: "12px",
    padding: "13px 22px",
    background: "#2f8b43",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
  },
  whatsappSmallButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #1f8f4d",
    background: "#1f8f4d",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
  },
  readyButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #b9822b",
    background: "#b9822b",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
  },
  closeSessionButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
  },
  success: {
    color: "#2f6f3e",
    marginTop: "12px",
  },
  linkBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    border: "1px solid #d6c5ad",
    borderRadius: "10px",
    padding: "8px",
    background: "#fffaf3",
  },
  linkText: {
    fontSize: "13px",
    color: "#5f5144",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  copyButton: {
    flexShrink: 0,
    padding: "10px 14px",
    background: "#fffaf3",
    border: "1px solid #d6c5ad",
    borderRadius: "8px",
    cursor: "pointer",
  },
  clientsList: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gap: "22px",
  },
  clientCard: {
    background: "rgba(255,250,243,0.95)",
    border: "1px solid #ddcdb8",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
  },
  clientTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
    marginBottom: "16px",
    flexWrap: "wrap" as const,
  },
  clientName: {
    fontSize: "25px",
    margin: "0 0 5px",
    fontWeight: 500,
  },
  clientCount: {
    margin: "0 0 4px",
    color: "#5f5144",
    fontSize: "14px",
  },
  progressArea: {
    marginTop: "12px",
    maxWidth: "420px",
  },
  progressTop: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#5f5144",
    marginBottom: "6px",
  },
  progressBar: {
    width: "100%",
    height: "9px",
    background: "#eadcc8",
    borderRadius: "99px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#2f8b43",
    borderRadius: "99px",
    transition: "width 0.3s ease",
  },
  clientActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap" as const,
    justifyContent: "flex-end",
  },
  rawButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #2b1811",
    background: "#2b1811",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
  },
  finalButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #2f8b43",
    background: "#2f8b43",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
  },
  deleteButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #e2b8b8",
    background: "#fffaf3",
    color: "#9b2525",
    cursor: "pointer",
    fontSize: "14px",
  },
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
    gap: "12px",
  },
  thumbImage: {
    width: "100%",
    height: "150px",
    objectFit: "contain" as const,
    display: "block",
    borderRadius: "12px",
    background: "#111",
    border: "1px solid #e5d6c0",
  },
};