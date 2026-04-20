// Produksjonsbenchmarks for slamtømming (Innlandet-kontrakt).
// Grønn sone når bil/operatør er på eller over benchmark i snitt per aktive dag.
export const BENCHMARK_TOMM_PER_DAG = 11
export const BENCHMARK_KUBIK_PER_DAG = 44

// Gul-terskel: 80% av benchmark. Under det er sonen rød.
export const GUL_PROSENT = 0.8

export type Zone = "green" | "yellow" | "red"

export function klassifiser(perDag: number, kubikPerDag: number): Zone {
  const tommGron = perDag >= BENCHMARK_TOMM_PER_DAG
  const tommGul = perDag >= BENCHMARK_TOMM_PER_DAG * GUL_PROSENT
  const kubikGron = kubikPerDag >= BENCHMARK_KUBIK_PER_DAG
  const kubikGul = kubikPerDag >= BENCHMARK_KUBIK_PER_DAG * GUL_PROSENT

  if (tommGron || kubikGron) return "green"
  if (tommGul || kubikGul) return "yellow"
  return "red"
}
