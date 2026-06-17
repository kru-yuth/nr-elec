// ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจก (Grid Emission Factor) ของประเทศไทย (kgCO2e / kWh)
// อ้างอิงจากองค์การบริหารจัดการก๊าซเรือนกระจก (อบก.)
export const CARBON_EMISSION_FACTOR = 0.4999;

// อัตราการดูดซับ CO2 ของต้นไม้เฉลี่ยต่อปี (kgCO2e / ต้น / ปี)
// อ้างอิงโดยเฉลี่ยคือ 9.5 - 15 kgCO2e/ต้น/ปี ในที่นี้ขอใช้ค่ามาตรฐานอนุรักษ์นิยมที่ 9.5
export const TREE_ABSORPTION_FACTOR_YEAR = 9.5;

// อัตราการดูดซับ CO2 ของต้นไม้เฉลี่ยต่อเดือน (kgCO2e / ต้น / เดือน)
// 9.5 / 12 = 0.7917
export const TREE_ABSORPTION_FACTOR_MONTH = 0.7917;
