export function contarDiasUteis(dataInicio: Date, dataFim: Date): number {
  let dias = 0;
  const data = new Date(dataInicio);

  while (data <= dataFim) {
    const dia = data.getDay();
    if (dia !== 0 && dia !== 6) dias += 1; // 0 = domingo, 6 = sabado
    data.setDate(data.getDate() + 1);
  }

  return dias;
}

export function calcularSemanaDoMes(dia: number): number {
  return Math.ceil(dia / 7);
}

export function obterIntervaloSemana(mes: string, semana: number) {
  const [ano, mesNum] = mes.split("-").map(Number);
  const ultimoDia = new Date(ano, mesNum, 0).getDate();

  const diaInicio = (semana - 1) * 7 + 1;
  const diaFim = Math.min(semana * 7, ultimoDia);

  return { diaInicio, diaFim };
}

export function calcularDiasUteisDoMes(mes: string): number {
  const [ano, mesNum] = mes.split("-").map(Number);
  const inicio = new Date(ano, mesNum - 1, 1);
  const fim = new Date(ano, mesNum, 0);
  return contarDiasUteis(inicio, fim);
}

export function calcularSemanasUteisDoMes(mes: string): number {
  const [ano, mesNum] = mes.split("-").map(Number);
  const ultimoDia = new Date(ano, mesNum, 0).getDate();
  return Math.ceil(ultimoDia / 7);
}
