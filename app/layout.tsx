import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/Layout";
import { Toaster } from "react-hot-toast";
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export const metadata: Metadata = {
  title: "Controle de Mão de Obra",
  description: "Sistema para gestão de obras e pagamentos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50">
        <Header />
        <Sidebar />
        <Layout>{children}</Layout>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

