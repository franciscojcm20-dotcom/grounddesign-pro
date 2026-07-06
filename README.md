# GroundDesign Pro

Plataforma SaaS de diseño de sistemas de puesta a tierra para ingenieros
eléctricos. Motor de cálculo propio (sin librerías de matemática de terceros,
sin IA/ML, sin APIs externas de pago) implementando IEEE Std 80-2013 e IEEE
Std 81-2012 con cálculo real y trazable de cada fórmula.

## Stack

- **`apps/web`** — Next.js 15 (App Router), React 19, TypeScript. Frontend.
- **`apps/api`** — Fastify 5, TypeScript. API REST, auth JWT, PostgreSQL.
- **`packages/engines-math`** — Motores de cálculo puros (sin dependencias
  externas de matemática), con su propia suite de tests.
- **`packages/pdf-engine`** — Generación de reportes PDF (PDFKit) y
  exportación DXF (AutoCAD), con su propia suite de tests.

Monorepo gestionado con pnpm workspaces.

## Módulos de cálculo

**Medición de suelo**
- Wenner e interpretación biestrato (método de asíntotas) — IEEE Std 81-2012 Cl. 8.3
- Schlumberger (forma exacta, Telford) — IEEE Std 81-2012 Cl. 8
- Modelo N capas — la estratificación **no se ingresa manualmente**: se
  determina ajustando el universo de curvas patrón de Orellana & Mooney
  (1966), evaluadas de forma exacta vía el kernel recursivo de Wait (1954),
  contra las lecturas reales de campo. El ajuste no lineal usa
  Levenberg-Marquardt (Gauss-Newton amortiguado) y prueba de 1 a 4 estratos,
  adoptando el modelo más simple que ya explica los datos dentro de la
  precisión habitual de un ensayo VES (evita interpretar ruido de medición
  como estratos ficticios).

**Análisis de falla**
- Motor de análisis de falla: determina y justifica la corriente de diseño
  (Ig) — IEEE Std 80-2013 Cl. 15.9–15.10.
- Motor de cortocircuito (componentes simétricas) para modelar Ig cuando no
  se dispone de un estudio de cortocircuito existente.

**Diseño de malla** (cada uno con vista 2D y vista 3D interactiva rotable)
- Resistencia de malla rectangular — ecuación de Sverak, IEEE Std 80-2013 Cl. 14.2
- Electrodos verticales (picas) en paralelo — Dwight/Sunde, IEEE 80-2013 Annex B.1
- Conductor horizontal enterrado — Dwight, IEEE 80-2013 Annex B.3
- Sistema radial / estrella — Laurent-Niemann
- Anillo perimetral — Sunde
- Malla + picas combinada — Schwarz (1954)
- Aditivo químico gel (mejoramiento de resistividad) — Dwight/Sunde, modelo de cilindros concéntricos

**Verificación**
- Tensiones de paso y de contacto, admisibles y reales — IEEE Std 80-2013 Cl. 16, modelo de Dalziel/Sverak
- Dimensionamiento térmico de conductor — ecuación de Onderdonk, IEEE Std 80-2013 Cl. 11.3
- GPR (elevación de potencial de tierra)
- Cubicación y valorización económica (CLP) — comparación de costo entre sistemas calculados

**Perfiles normativos por país** (seleccionable, afecta los umbrales de cumplimiento)
- IEEE 80/81 · SEC/RIC (Chile) — perfil por defecto
- RETIE (Colombia)
- REBT (España)
- NBR (Brasil)

Todos los módulos están interconectados vía contextos compartidos: el
modelo de suelo medido en campo alimenta el diseño de malla, la corriente de
diseño del Motor de Análisis de Falla alimenta todos los módulos posteriores,
y el perfil normativo seleccionado se aplica de forma consistente en
compliance, tensiones y el reporte final.

## Plataforma

- Autenticación JWT real, historial de proyectos y resultados persistidos en PostgreSQL
- Planes de suscripción (Community/Individual/Professional) con facturación vía Stripe
- Panel de administración con control de acceso restringido por lista explícita de correos
- Validación de esquema (zod) en todos los endpoints de cálculo antes de procesar datos
- Reportes PDF profesionales (memoria de cálculo completa, firmable)
- Exportación DXF de la geometría de cada topología
- Comparación de sistemas calculados para elegir el diseño final (técnico + económico)
- i18n: 8 idiomas (ES/EN/PT/FR/DE/IT/JA/ZH)

## Calidad y despliegue

- Suite de pruebas automatizadas (motor de cálculo, API e interfaz), ejecutada en cada
  cambio mediante integración continua (CI)
- Tracking de errores en producción (Sentry, opcional — deshabilitado si no se configura)
- Migraciones de base de datos versionadas (`apps/api/src/db/migrations/`)
- Despliegue a AWS (App Runner + RDS + ECR) vía infraestructura como código (Terraform)
  y entrega continua (CD) — ver `DEPLOYMENT.md`

## Alcance actual y roadmap

Este repositorio implementa, con cálculo real y trazable, únicamente **IEEE Std 80-2013**,
**IEEE Std 81-2012** y los perfiles normativos de país listados arriba (RETIE, REBT, NBR,
SEC/RIC). Normas mencionadas en la visión de producto más amplia pero **no implementadas
todavía** en este código:

- IEC 60364, IEC 61936, IEC 62305, IEC 62561
- IEEE Std 142, IEEE Std 837, IEEE Std 998
- NFPA 70, NFPA 780

Un producto separado orientado a protección contra rayos (Strike Ground Design / LPS,
IEC 62305) está en etapa de planificación, sin código implementado aún, y no forma parte
de este monorepo por ahora.

## Desarrollo

```bash
pnpm install
pnpm --filter @gdp/api migrate   # aplica el esquema (apps/api/src/db/migrations/)
pnpm dev                         # apps/api (puerto 3001) + apps/web (puerto 3000)
pnpm -r typecheck
pnpm -r test
```

Requiere una instancia de PostgreSQL corriendo localmente (ver `apps/api/.env`
para la cadena de conexión, o `docker compose up` que la levanta y migra automáticamente).

## Advertencia

Los resultados de este software deben ser validados y firmados por un
ingeniero eléctrico competente antes de cualquier uso en construcción real.
