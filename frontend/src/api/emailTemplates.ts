// src/api/emailTemplates.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { EmailTemplatesResponse, EmailTemplate } from "./types";

export const EMAIL_TEMPLATES_QUERY_KEY = ["admin-email-templates"] as const;

async function fetchEmailTemplates(): Promise<EmailTemplatesResponse> {
  const res = await api.get<EmailTemplatesResponse>("/api/admin/email-templates");
  return res.data;
}

export function useEmailTemplatesQuery(enabled: boolean) {
  return useQuery<EmailTemplatesResponse>({
    queryKey: EMAIL_TEMPLATES_QUERY_KEY,
    queryFn: fetchEmailTemplates,
    enabled,
  });
}

type CreateEmailTemplatePayload = {
  key: string;
  subject: string;
  body: string;
};

async function createEmailTemplate(
  payload: CreateEmailTemplatePayload
): Promise<EmailTemplate> {
  const res = await api.post<{ template: EmailTemplate }>(
    `/api/admin/email-templates`,
    payload
  );
  return res.data.template;
}

export function useCreateEmailTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_TEMPLATES_QUERY_KEY });
    },
  });
}

type UpdateEmailTemplatePayload = {
  key: string;
  subject: string;
  body: string;
};

async function updateEmailTemplate(
  payload: UpdateEmailTemplatePayload
): Promise<EmailTemplate> {
  const res = await api.put<{ template: EmailTemplate }>(
    `/api/admin/email-templates/${payload.key}`,
    { subject: payload.subject, body: payload.body }
  );
  return res.data.template;
}

export function useUpdateEmailTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_TEMPLATES_QUERY_KEY });
    },
  });
}

async function deleteEmailTemplate(key: string): Promise<{ ok: true }> {
  const res = await api.delete<{ ok: true }>(`/api/admin/email-templates/${key}`);
  return res.data;
}

export function useDeleteEmailTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_TEMPLATES_QUERY_KEY });
    },
  });
}
