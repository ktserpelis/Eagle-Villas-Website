import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { Property } from "./types";


export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const res = await api.get<Property[]>("/api/properties");
      return res.data;
    },
  });
}

export function useProperty(slug: string) {
  return useQuery({
    queryKey: ["property", slug],
    queryFn: async () => {
      const res = await api.get<Property>(`/api/properties/${slug}`);
      return res.data;
    },
    enabled: !!slug,
  });
}
