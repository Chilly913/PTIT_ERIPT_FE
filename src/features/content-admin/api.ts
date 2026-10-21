"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";

export interface AdminNews {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  status: "draft" | "published";
  is_featured: boolean;
  published_at: string | null;
  updated_at: string;
}
export interface AdminNewsDetail extends AdminNews {
  content: string | null;
}
export interface NewsInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  status: "draft" | "published";
  is_featured: boolean;
}

export interface AdminPartner {
  id: number;
  name: string;
  logo: string;
  website_url: string | null;
  sort_order: number;
  is_active: boolean;
}
export interface PartnerInput {
  name: string;
  logo: string;
  website_url: string;
  sort_order: number;
  is_active: boolean;
}

export const newsKey = ["admin-news"] as const;
export const partnersKey = ["admin-partners"] as const;

export interface NewsQuery {
  page: number;
  search: string;
  status: "" | "draft" | "published";
  sort?: string;
  dir?: "asc" | "desc";
}

export interface PartnersQuery {
  page: number;
  search: string;
  is_active: "" | "true" | "false";
  sort?: string;
  dir?: "asc" | "desc";
}

export function useNewsList(q: NewsQuery) {
  return useQuery({
    queryKey: [...newsKey, "list", q],
    queryFn: ({ signal }) => api.get<Paginated<AdminNews>>("/admin/news", { query: { page: q.page, per_page: 10, search: q.search, status: q.status, sort: q.sort ?? "", dir: q.dir ?? "" }, signal }),
    placeholderData: keepPreviousData,
  });
}

export function fetchNews(id: number) {
  return api.get<AdminNewsDetail>(`/admin/news/${id}`);
}

export function useNewsMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: newsKey });
  return {
    save: useMutation({
      mutationFn: ({ id, body }: { id?: number; body: NewsInput }) =>
        id ? api.put<AdminNewsDetail>(`/admin/news/${id}`, body) : api.post<AdminNewsDetail>("/admin/news", body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.delete(`/admin/news/${id}`), onSuccess: done }),
  };
}

export function usePartnersList(q: PartnersQuery) {
  return useQuery({
    queryKey: [...partnersKey, "list", q],
    queryFn: ({ signal }) => api.get<Paginated<AdminPartner>>("/admin/partners", { query: { page: q.page, per_page: 10, search: q.search, is_active: q.is_active, sort: q.sort ?? "", dir: q.dir ?? "" }, signal }),
    placeholderData: keepPreviousData,
  });
}

export function usePartnerMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: partnersKey });
  return {
    save: useMutation({
      mutationFn: ({ id, body }: { id?: number; body: PartnerInput }) =>
        id ? api.put<AdminPartner>(`/admin/partners/${id}`, body) : api.post<AdminPartner>("/admin/partners", body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.delete(`/admin/partners/${id}`), onSuccess: done }),
  };
}
