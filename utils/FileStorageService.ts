// src/utils/FileStorageService.ts
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// O caminho para a pasta de uploads, a partir da raiz do projeto
const UPLOADS_DIR = path.resolve(__dirname, "..", "..", "uploads");

class FileStorageService {
  /**
   * Garante que a pasta de uploads exista.
   */
  private async ensureUploadsDirExists(): Promise<void> {
    try {
      await fs.access(UPLOADS_DIR);
    } catch (error) {
      // Se a pasta não existe, cria-a
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
    }
  }

  /**
   * Salva uma imagem em Base64.
   * @param base64String A string da imagem em Base64.
   * @returns A URL pública completa do ficheiro salvo.
   */
  public async saveBase64(base64String: string): Promise<string | null> {
    if (!base64String || base64String.trim() === "") {
      return null;
    }

    await this.ensureUploadsDirExists();

    const matches = base64String.match(
      /^data:(image\/([a-zA-Z]+));base64,(.+)$/
    );
    if (!matches || matches.length !== 4) {
      throw new Error("Formato de string Base64 inválido.");
    }

    const extension = matches[2];
    const imageBuffer = Buffer.from(matches[3], "base64");
    const uniqueFilename = `${uuidv4()}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);

    await fs.writeFile(filePath, imageBuffer);

    // --- CORREÇÃO AQUI ---
    // Retorna a URL completa usando a variável de ambiente e o caminho /uploads/
    return `${process.env.APP_URL}/uploads/${uniqueFilename}`;
  }

  /**
   * Salva um ficheiro enviado via formulário (multipart/form-data).
   * @param file O objeto do ficheiro (geralmente do Multer).
   * @returns O URL público completo do ficheiro salvo.
   */
  public async save(file: Express.Multer.File): Promise<string> {
    await this.ensureUploadsDirExists();

    // O Multer já deve ter salvo o arquivo na pasta 'uploads' com um 'filename' único
    // (Verifique sua configuração do Multer se 'file.filename' não for o nome final)

    // --- CORREÇÃO AQUI ---
    // Retorna a URL completa usando a variável de ambiente e o caminho /uploads/
    const fileUrl = `${process.env.APP_URL}/uploads/${file.filename}`;
    return fileUrl;
  }
}

export default new FileStorageService();
