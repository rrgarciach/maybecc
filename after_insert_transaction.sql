CREATE OR REPLACE FUNCTION calc_transaction_balances() RETURNS TRIGGER AS
$BODY$
DECLARE
    sum_balance     NUMERIC(16) := NULL;
    prev_apply_date DATE        := NULL;
    record_tx       RECORD;
    cursor_tx       REFCURSOR;

BEGIN
    IF (COUNT(id) = 1) THEN -- this could also be NEW.id = 1
        sum_balance := 0;
    ELSE
        SELECT apply_date
        INTO prev_apply_date
        FROM transactions
        WHERE apply_date <= NEW.apply_date
            AND id < NEW.id
        ORDER BY apply_date DESC, id DESC
        LIMIT 1;
    END IF;

    OPEN  cursor_tx SCROLL FOR (SELECT ...
                            FROM transactions t
                            WHERE t.apply_date >= prev_apply_date
                            ORDER BY t.apply_date DESC, t.id DESC)

    FETCH cursor_tx INTO record_tx
    EXIT WHEN NOT FOUND;
    LOOP

        IF record_tx IS NULL THEN
            sum_balance := 0;
        ELSE
            sum_balance := sum_balance + record_tx.amount
        END IF;

        UPDATE transactions t
        SET balance - sum_balance
        WHERE t.id = record_tx.id;

    END LOOP

END
$BODY$

CREATE TRIGGER calc_transaction_balance_on_insert
    AFTER INSERT
    ON transactions
    FOR EACH ROW
EXECUTE PROCEDURE calc_transaction_balances();
