SELECT
	cast(t1.SHP_ORD_EXTERNAL_REFERENCE_ID as integer) as Shipment_1, -- ID Original
	t2.SHP_SHIPMENT_ID as Shipment_2, -- ID da Devolução
	t1.SHP_ORD_PARTNER as NED,
	t3.SHP_STATUS_ID as Status_Ship_1,
	t3.SHP_SUBSTATUS_ID as Substatus_Ship_1,
	t2.SHP_STATUS_ID as Status_Ship_2,
	t3.SHP_ORDER_COST as Valor
FROM
	`meli-bi-data.WHOWNER.BT_SHP_SHIPPING_ORDER` as t1
	LEFT JOIN `meli-bi-data.WHOWNER.BT_SHP_SHIPMENTS_V2` as t2 ON t1.SHP_SHIPPING_ORDER_ID = t2.SHP_EXTERNAL_AFFINITY_GROUP_ID
	LEFT JOIN `meli-bi-data.WHOWNER.BT_SHP_SHIPMENTS` as t3 ON (
		cast(t1.SHP_ORD_EXTERNAL_REFERENCE_ID as integer) = t3.SHP_SHIPMENT_ID
	)
WHERE
	t2.SHP_SHIPMENT_ID IN (ID_PACOTES) -- Substitua por uma lista de IDs de pacotes
