import * as Minio from 'minio';
import path from 'node:path';

const minioClient = new Minio.Client({
  endPoint: 'minio-h4wos0o48s08ww80wg4ookgg.is-on.cloud',
  port: 443,
  useSSL: true,
  accessKey: 'gkfRYXU0rVj40Mre3vE2',
  secretKey: 'VfTVWsdTlwJtY1hxqMmACPjW8M77bI4rroGJ2riw',
  region: 'sp',
});

const uploadFile: (filePath: string) => Promise<boolean> = async (filePath: string) => {
  const bucketName = 'gamersbrawl';
  const filename = filePath.split('/').pop() || filePath;
  const destinationFilename = path.join('counterstrike/matches', filename);
  console.log(`destinationFilename: ${destinationFilename} => ${filePath}`);

  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName);
    }
    await minioClient.fPutObject(bucketName, destinationFilename, filePath);
    return true;
  } catch (error) {
    console.error(`Error on upload:`, error);
    throw error;
  }
};
export default uploadFile;
