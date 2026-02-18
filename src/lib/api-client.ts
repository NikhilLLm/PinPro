import { IImage } from "@/models/Image";

export type MyImageFormData = Omit<IImage, "_id" | "createdAt" | "updatedAt">;

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

class ApiClient {
  private async fetch<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { method = "GET", body, headers = {} } = options;

    const defaultHeaders = {
      "Content-Type": "application/json",
      ...headers,
    };

    const response = await fetch(`/api${endpoint}`, {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  }

  async getImages() {
    return this.fetch<IImage[]>("/images");
  }

  async getImage(id: string) {
    return this.fetch<IImage>(`/images/${id}`);
  }

  async createImage(imageData: MyImageFormData) {
    return this.fetch<IImage>("/images", {
      method: "POST",
      body: imageData,
    });
  }
}

export const apiClient = new ApiClient();