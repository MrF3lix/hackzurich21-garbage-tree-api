const { BlobServiceClient } = require("@azure/storage-blob");

const AZURE_STORAGE_CONNECTION_STRING =
  process.env.NODE_ENV === "development"
    ? process.env.AZURE_STORAGE_CONNECTION_STRING_HZ21
    : process.env.AZURE_STORAGE_CONNECTION_STRING;

module.exports = async function (context, req) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    AZURE_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient("data");
  const files = [];
  for await (const blob of containerClient.listBlobsFlat()) {
    files.push(blob.name);
  }

  const act = req.query.act;
  if (!files.find((f) => f.startsWith(act))) {
    context.res = {
      status: 404,
      body: { message: `Could not find file with ACT: ${act}` },
    };
    return;
  }

  const blobClient = containerClient.getBlobClient(`${act}.json`);
  const response = await blobClient.download();
  const info = await streamToString(response.readableStreamBody);

  context.res = {
    status: 200,
    body: info,
  };
};

async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => {
      chunks.push(data.toString());
    });
    readableStream.on("end", () => {
      resolve(chunks.join(""));
    });
    readableStream.on("error", reject);
  });
}
