WITH
    ids AS (
        SELECT
            [45858206761] AS target_ids
    )
SELECT
    DATE(a.INITIAL_DATE) AS DATA,
    a.ROUTE.CARRIER.DISPLAY_NAME AS MLP,
    a.ROUTE.DRIVER.NAME AS DRIVER,
    a.ROUTE.VEHICLE.LICENSE_PLATE AS PLACA,
    b.ROUTE_NAME AS ROTA,
    ARRAY (
        SELECT
            id
        FROM
            UNNEST (a.SHIPMENTS.DISPATCHED_IDS) AS id
        WHERE
            id IN UNNEST (ids.target_ids)
    ) AS SHIPMENT_ID
FROM
    meli-bi-data.WHOWNER.BT_SHP_MT_LOGISTICS_ROUTE AS a
    LEFT JOIN WHOWNER.LK_SHP_OPS_CLOCK_REPORTS_METRICS_ROUTES_PROD AS b ON CAST(b.ROUTE_ID AS STRING) = a.ID
    CROSS JOIN ids
WHERE
    a.FACILITY.ID = 'SMG2'
    AND DATE(a.INITIAL_DATE) >= '2026-01-01'
    AND EXISTS (
        SELECT
            1
        FROM
            UNNEST (a.SHIPMENTS.DISPATCHED_IDS) AS id
        WHERE
            id IN UNNEST (ids.target_ids)
    );