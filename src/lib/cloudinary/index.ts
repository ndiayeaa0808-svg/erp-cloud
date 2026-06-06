export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
  apiKey: process.env.CLOUDINARY_API_KEY || "",
  apiSecret: process.env.CLOUDINARY_API_SECRET || "",
};

export const getCloudinaryUrl = (publicId: string, options?: {
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
}) => {
  const { cloudName } = cloudinaryConfig;
  if (!cloudName) return "";

  const transformations: string[] = [];
  if (options?.width) transformations.push(`w_${options.width}`);
  if (options?.height) transformations.push(`h_${options.height}`);
  if (options?.quality) transformations.push(`q_${options.quality}`);
  if (options?.format) transformations.push(`f_${options.format}`);

  const tx = transformations.length > 0 ? `${transformations.join(",")}/` : "";
  return `https://res.cloudinary.com/${cloudName}/image/upload/${tx}${publicId}`;
};

export const uploadToCloudinary = async (
  file: File,
  folder: string = "erp-cloud"
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "upload_preset",
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ""
  );
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Upload failed");
  }

  const data = await response.json();
  return data.public_id;
};
