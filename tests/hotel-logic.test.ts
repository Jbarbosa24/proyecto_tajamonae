import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';

// --- LÓGICA DE NEGOCIO SIMULADA ---
export const processCheckIn = async (supabaseClient: any, rfidUid: string) => {
  const { data, error } = await supabaseClient.from('operarios').select('*').eq('rfid_uid', rfidUid).single();
  if (error || !data) {
    return { success: false, message: 'Invalid check-in', state: null };
  }
  return { success: true, message: 'Check-in exitoso', state: { userId: data.id, active: true } };
};

export const assignRoom = async (supabaseClient: any, roomId: string, currentOccupancy: number, capacity: number) => {
  if (currentOccupancy >= capacity) {
    throw new Error('Capacidad de habitación llena');
  }
  await supabaseClient.from('asignaciones').insert({ roomId });
  return { success: true };
};

// --- COMPONENTE SIMULADO (MOCK COMPONENT) ---
const HotelComponent = ({ supabaseClient }: { supabaseClient: any }) => {
  const [status, setStatus] = useState<string>('');

  const handleCheckIn = async () => {
    const result = await processCheckIn(supabaseClient, 'VALID-RFID-123');
    if (result.success) {
      setStatus(result.message);
    }
  };

  const handleAssign = async () => {
    try {
      await assignRoom(supabaseClient, 'room-101', 4, 4); // Simulación de habitación llena
      setStatus('Asignado exitosamente');
    } catch (error: any) {
      setStatus(error.message);
    }
  };

  return React.createElement('div', null,
    React.createElement('button', { onClick: handleCheckIn, 'data-testid': 'checkin-btn' }, 'Check-in'),
    React.createElement('button', { onClick: handleAssign, 'data-testid': 'assign-btn' }, 'Assign'),
    React.createElement('div', { 'data-testid': 'status' }, status)
  );
};

// --- PRUEBAS UNITARIAS ---
describe('Hotel Tajamonae - Lógica de Negocio y Componentes', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Mock del cliente Supabase
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'operario-123' }, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
  });

  it('Check-in exitoso: Verifica que cuando la función de registro recibe un UID válido de RFID, retorna el objeto de estado correcto y llama a la base de datos simulada.', async () => {
    // 1. Verificación pura de la lógica de negocio
    const result = await processCheckIn(mockSupabase, 'VALID-RFID-123');
    
    expect(result).toEqual({ 
      success: true, 
      message: 'Check-in exitoso', 
      state: { userId: 'operario-123', active: true } 
    });
    
    // Verificamos que se llamó a la base de datos simulada
    expect(mockSupabase.from).toHaveBeenCalledWith('operarios');
    expect(mockSupabase.eq).toHaveBeenCalledWith('rfid_uid', 'VALID-RFID-123');

    // 2. Verificación del componente simulado interactuando con la lógica
    render(React.createElement(HotelComponent, { supabaseClient: mockSupabase }));
    fireEvent.click(screen.getByTestId('checkin-btn'));
    
    // Esperamos a que el estado se actualice asíncronamente
    expect(await screen.findByText('Check-in exitoso')).toBeDefined();
  });

  it('Excepción de Sobrebooking: Verifica que si la función de asignación detecta que la capacidad de la habitación está llena (estado simulado), detiene la ejecución y lanza una excepción controlada sin llamar a la base de datos.', async () => {
    // Limpiamos los mocks de la base de datos antes de esta prueba
    vi.clearAllMocks();

    // 1. Verificación pura de la lógica de negocio
    await expect(assignRoom(mockSupabase, 'room-101', 4, 4)).rejects.toThrow('Capacidad de habitación llena');
    
    // Verificamos estrictamente que NO se llamó a la base de datos simulada
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockSupabase.insert).not.toHaveBeenCalled();

    // 2. Verificación del componente simulado manejando la excepción
    render(React.createElement(HotelComponent, { supabaseClient: mockSupabase }));
    fireEvent.click(screen.getByTestId('assign-btn'));
    
    expect(await screen.findByText('Capacidad de habitación llena')).toBeDefined();
  });
});
