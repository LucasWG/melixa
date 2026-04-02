WITH
    id_order AS (
        SELECT
            id,
        offset
            AS sort_order
        FROM
            UNNEST (
                [
                    45913172862,
                    45916175105,
                    45943980214,
                    45948570256,
                    45959928992,
                    45962356507,
                    45971451044
                ]
            ) AS id
        WITH
        OFFSET
    )
SELECT
    T.SHP_SHIPMENT_ID,
    ITE.SHP_ITEM_DESC,
    T.SHP_ORDER_COST AS VALOR_REAL
FROM
    `meli-bi-data.WHOWNER.BT_SHP_SHIPMENTS` AS T,
    UNNEST (T.ITEMS) AS ITE
    JOIN id_order AS O ON T.SHP_SHIPMENT_ID = O.id
ORDER BY
    O.sort_order