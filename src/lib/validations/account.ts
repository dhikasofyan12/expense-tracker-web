import { z } from "zod";

export const updateNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(60, "Nama maksimal 60 karakter."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi."),
    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter.")
      .max(128, "Password baru maksimal 128 karakter."),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak sama.",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Password baru harus berbeda dari password saat ini.",
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password wajib diisi."),
  confirmText: z.literal("HAPUS", { message: 'Ketik "HAPUS" untuk konfirmasi.' }),
});