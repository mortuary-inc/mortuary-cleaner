export function groupBy<T, K extends keyof T>(datas: T[], by: K): Map<T[K], T[]> {
  const map = new Map<T[K], T[]>();
  for (const data of datas) {
    const key = data[by];
    let list = map.get(key);
    if (!list) {
      list = [];
      map.set(key, list);
    }
    list.push(data);
  }
  return map;
}

export function toMap<T, K extends keyof T>(datas: T[], by: K): Map<T[K], T> {
  const map = new Map<T[K], T>();
  for (const data of datas) {
    const key = data[by];
    map.set(key, data);
  }
  return map;
}

export function getOne<T>(array: T[]) : T {
  return array[Math.floor(Math.random() * array.length)];
}

export function getChuncks<T>(array: T[], chunkSize: number){
  let results : T[][] = [];
  while (array.length) {
      results.push(array.splice(0, chunkSize));
  }
  return results;
}