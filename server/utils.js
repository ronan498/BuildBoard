const { BlobSASPermissions, generateBlobSASQueryParameters } = require("@azure/storage-blob");

const blobNameFromUrl = (url) => {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.pathname.split("/").pop();
  } catch {
    return null;
  }
};

const sasUrl = (container, blobName, blobService) => {
  const expiresOn = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: container.containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    blobService.credential
  ).toString();
  return `${container.getBlockBlobClient(blobName).url}?${sas}`;
};

const avatarUrlFromData = (data, container, blobService) => {
  try {
    const { avatarUri } = JSON.parse(data || "{}");
    if (!avatarUri) return null;
    const name = blobNameFromUrl(avatarUri);
    return name && container && blobService
      ? sasUrl(container, name, blobService)
      : avatarUri;
  } catch {
    return null;
  }
};

module.exports = { blobNameFromUrl, sasUrl, avatarUrlFromData };
