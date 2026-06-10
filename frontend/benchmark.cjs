const { performance } = require('perf_hooks');

const tasks = [];
for (let i = 0; i < 100000; i++) {
  const depts = ['maintenance', 'operations', 'station_manager', 'station', 'other'];
  tasks.push({
    id: `task_${i}`,
    department: depts[Math.floor(Math.random() * depts.length)],
  });
}

// Filter approach
const startFilter = performance.now();
for (let i = 0; i < 100; i++) {
  const maintenanceTasks = tasks.filter(t => t.department?.toLowerCase() === 'maintenance');
  const operationsTasks = tasks.filter(t => t.department?.toLowerCase() === 'operations');
  const stationTasks = tasks.filter(t =>
    t.department?.toLowerCase() === 'station_manager' ||
    t.department?.toLowerCase() === 'station'
  );
}
const endFilter = performance.now();
console.log(`Filter approach took: ${endFilter - startFilter} ms`);

// Reduce approach
const startReduce = performance.now();
for (let i = 0; i < 100; i++) {
  const { maintenanceTasks, operationsTasks, stationTasks } = tasks.reduce(
    (acc, t) => {
      const dept = t.department?.toLowerCase();
      if (dept === 'maintenance') {
        acc.maintenanceTasks.push(t);
      } else if (dept === 'operations') {
        acc.operationsTasks.push(t);
      } else if (dept === 'station_manager' || dept === 'station') {
        acc.stationTasks.push(t);
      }
      return acc;
    },
    { maintenanceTasks: [], operationsTasks: [], stationTasks: [] }
  );
}
const endReduce = performance.now();
console.log(`Reduce approach took: ${endReduce - startReduce} ms`);
