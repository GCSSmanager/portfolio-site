import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { handleDemoRequest } from "./handlers";

export function installDemoApi(api: AxiosInstance) {
  api.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const result = await handleDemoRequest(config);
    const response: AxiosResponse = {
      data: result.data,
      status: result.status,
      statusText: result.status >= 400 ? "Error" : "OK",
      headers: result.headers ?? {},
      config,
    };
    if (result.status >= 400) {
      const error = Object.assign(new Error("Demo API error"), {
        response,
        config,
        isAxiosError: true,
      });
      throw error;
    }
    return response;
  };
}
