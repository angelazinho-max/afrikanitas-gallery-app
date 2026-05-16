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

    let uploadedCount = 0;

    for (const file of allFiles) {
      setUploadProgress(
        `A processar ${uploadedCount + 1} de ${allFiles.length} fotografias...`
      );

      const compressedFile = await compressImage(file);

      const previewName = file.name
        .replace(/\s+/g, "-")
        .toLowerCase();

      const previewPath = `${cleanClientName}/previews/${previewName}.webp`;

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

      uploadedCount++;

      setUploadProgress(
        `${uploadedCount} de ${allFiles.length} fotografias carregadas`
      );
    }

    setUploadMessage(
      `${allFiles.length} fotografia(s) carregada(s) com sucesso.`
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

      canvas.width =
        img.width > maxWidth
          ? maxWidth
          : img.width;

      canvas.height =
        img.width > maxWidth
          ? img.height * scale
          : img.height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject();

        return;
      }

      ctx.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject();

            return;
          }

          resolve(blob);
        },
        "image/webp",
        0.7
      );
    };

    img.onerror = reject;
  });
};