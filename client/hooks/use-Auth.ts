"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { log } from "console";

export default function useAuth() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem("token");
     
      
      if (!token) {
        setLoading(false);
        router.push("/login");
        return;
      }

try {
  const response = await api.get("/profile/me");



  setAuthenticated(true);
  setLoading(false);
} catch (error: any) {


  setAuthenticated(false);
  setLoading(false);
}
    };

    verifyUser();
  }, [router]);


  return { loading, authenticated };
}