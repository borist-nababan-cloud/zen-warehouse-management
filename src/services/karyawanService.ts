import { supabase } from '@/lib/supabase';
import {
  HrdKaryawanInfo,
  KaryawanListParams,
  KaryawanListResponse,
} from '@/types/hrd';

const EMPLOYEE_BUCKET = 'employee-photos';

/**
 * Compresses an image file client-side to ensure fast uploads and low bandwidth.
 * Scales down to max 1000px dimension and converts to JPEG at 0.82 quality.
 */
async function compressEmployeeImage(file: File): Promise<File> {
  // If already very small (< 200KB) and JPEG/WEBP, return as is
  if (file.size <= 200 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1000;
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^/.]+$/, '') || 'employee';
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        0.82
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}

export const karyawanService = {
  /**
   * Mengambil daftar karyawan dengan server-side pagination, filter status aktif, outlet, dan pencarian nama.
   */
  async getKaryawanList(params: KaryawanListParams): Promise<KaryawanListResponse> {
    const { page = 1, pageSize = 25, kode_outlet, activeStatus = 'Y', search } = params;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('ot_hrd_karyawan_info')
      .select('*, master_outlet(kode_outlet, name_outlet)', { count: 'exact' });

    // Filter outlet jika diberikan dan bukan 'ALL'
    if (kode_outlet && kode_outlet !== 'ALL') {
      query = query.eq('kode_outlet', kode_outlet);
    }

    // Filter status aktif: default 'Y', bisa 'N' atau 'ALL'
    if (activeStatus && activeStatus !== 'ALL') {
      query = query.eq('active', activeStatus);
    }

    // Pencarian nama karyawan (case-insensitive LIKE)
    if (search && search.trim() !== '') {
      query = query.ilike('namakaryawan', `%${search.trim()}%`);
    }

    // Urutan: status 'Y' lebih dulu, lalu nama karyawan urut alfabetis
    query = query
      .order('active', { ascending: false })
      .order('namakaryawan', { ascending: true })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching karyawan list:', error);
      throw error;
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return {
      data: (data || []) as HrdKaryawanInfo[],
      count: totalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Mengubah status aktif ('Y' atau 'N') untuk satu karyawan berdasarkan ID.
   */
  async updateKaryawanStatus(id: string, active: 'Y' | 'N'): Promise<void> {
    const { error } = await supabase
      .from('ot_hrd_karyawan_info')
      .update({
        active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating karyawan status:', error);
      throw error;
    }
  },

  /**
   * Mengunggah foto resmi karyawan ke Supabase Storage dan memperbarui kolom `foto_url`.
   */
  async uploadEmployeePhoto(
    file: File,
    kode_outlet: string,
    kodekaryawan: string,
    id: string
  ): Promise<string> {
    const compressed = await compressEmployeeImage(file);

    const safeOutlet = (kode_outlet || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeKdk = (kodekaryawan || 'emp').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${safeOutlet}/${safeKdk}_${Date.now()}.jpg`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(EMPLOYEE_BUCKET)
      .upload(filePath, compressed, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      console.error('Error uploading employee photo:', uploadError);
      throw new Error(`Gagal mengunggah foto karyawan: ${uploadError.message}`);
    }

    // Dapatkan URL publik
    const { data: publicData } = supabase.storage
      .from(EMPLOYEE_BUCKET)
      .getPublicUrl(filePath);

    const fotoUrl = publicData.publicUrl;

    // Simpan ke database
    const { error: updateError } = await supabase
      .from('ot_hrd_karyawan_info')
      .update({
        foto_url: fotoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error saving foto_url to ot_hrd_karyawan_info:', updateError);
      throw new Error(`Gagal menyimpan URL foto ke database: ${updateError.message}`);
    }

    return fotoUrl;
  },

  /**
   * Menghapus foto karyawan dari database (mengosongkan foto_url).
   */
  async removeEmployeePhoto(id: string): Promise<void> {
    const { error } = await supabase
      .from('ot_hrd_karyawan_info')
      .update({
        foto_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error removing foto_url:', error);
      throw error;
    }
  },
};

