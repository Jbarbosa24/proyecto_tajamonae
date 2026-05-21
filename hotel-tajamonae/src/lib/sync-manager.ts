import { getPendingTasks, removeTask, updateTaskStatus, OfflineTask } from './offline-storage';
import { 
  iniciarLimpiezaAction, 
  finalizarLimpiezaAction, 
  reportarIncidenciaAction, 
  registrarLavanderiaAction, 
  entregarLavanderiaAction 
} from '@/app/(aseadora)/camareria/actions';

let isSyncing = false;

export async function synchronizeTasks(force = false) {
  if (isSyncing || (!navigator.onLine && !force)) return;
  
  const pending = await getPendingTasks();
  if (pending.length === 0) return;

  isSyncing = true;
  console.log(`[Sync] Iniciando sincronización de ${pending.length} tareas...`);

  for (const task of pending) {
    try {
      await updateTaskStatus(task.id, 'syncing');
      
      let result;
      switch (task.type) {
        case 'INICIAR_LIMPIEZA':
          result = await iniciarLimpiezaAction(task.payload.roomId, task.payload.foto);
          break;
        case 'FINALIZAR_ASEO':
          result = await finalizarLimpiezaAction(task.payload.regId, task.payload.roomId, task.payload.checklist, task.payload.foto);
          break;
        case 'REPORTAR_INCIDENCIA':
          result = await reportarIncidenciaAction(task.payload.roomId, task.payload.text);
          break;
        case 'REGISTRAR_LAVANDERIA':
          result = await registrarLavanderiaAction(task.payload.roomId, task.payload.prendas, task.payload.foto);
          break;
        case 'ENTREGAR_LAVANDERIA':
          result = await entregarLavanderiaAction(task.payload.regId, task.payload.foto);
          break;
      }

      if (result?.ok) {
        await removeTask(task.id);
        console.log(`[Sync] Tarea ${task.id} completada con éxito.`);
      } else {
        throw new Error(result?.message || 'Error desconocido');
      }
    } catch (error) {
      console.error(`[Sync] Error sincronizando tarea ${task.id}:`, error);
      await updateTaskStatus(task.id, 'pending', String(error));
      // Stop syncing the rest if we are still offline or have a critical error
      if (!navigator.onLine) break;
    }
  }

  isSyncing = false;
}

// Inicializar listeners globales
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Sync] Red recuperada. Intentando sincronización...');
    synchronizeTasks();
  });

  // Reintentar periódicamente cada 1 minuto por si acaso
  setInterval(synchronizeTasks, 60000);
}
