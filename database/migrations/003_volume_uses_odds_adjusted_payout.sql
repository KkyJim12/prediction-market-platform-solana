BEGIN;

CREATE OR REPLACE FUNCTION refresh_user_stats(target_wallet varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO users (wallet_address)
  VALUES (target_wallet)
  ON CONFLICT (wallet_address) DO NOTHING;

  UPDATE users
  SET
    volume_base_units = totals.volume,
    base_volume_base_units = totals.base_volume,
    realized_pnl_base_units = totals.realized_pnl,
    trades = totals.trades,
    wins = totals.wins,
    losses = totals.losses,
    updated_at = now()
  FROM (
    SELECT
      COALESCE(sum(potential_payout_base_units), 0) AS volume,
      COALESCE(sum(stake_base_units), 0) AS base_volume,
      COALESCE(sum(
        CASE
          WHEN status = 'won' THEN COALESCE(amount_paid_base_units, potential_payout_base_units) - stake_base_units
          WHEN status = 'lost' THEN -stake_base_units
          ELSE 0
        END
      ), 0) AS realized_pnl,
      count(*)::integer AS trades,
      count(*) FILTER (WHERE status = 'won')::integer AS wins,
      count(*) FILTER (WHERE status = 'lost')::integer AS losses
    FROM positions
    WHERE wallet_address = target_wallet
  ) totals
  WHERE users.wallet_address = target_wallet;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_test_user_stats(target_wallet varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE test_users
  SET
    volume_base_units = totals.volume,
    base_volume_base_units = totals.base_volume,
    realized_pnl_base_units = totals.pnl,
    trades = totals.trades,
    wins = totals.wins,
    losses = totals.losses,
    updated_at = now()
  FROM (
    SELECT
      COALESCE(sum(potential_payout_base_units), 0) AS volume,
      COALESCE(sum(stake_base_units), 0) AS base_volume,
      COALESCE(sum(
        CASE
          WHEN status = 'won' THEN COALESCE(amount_paid_base_units, potential_payout_base_units) - stake_base_units
          WHEN status = 'lost' THEN -stake_base_units
          ELSE 0
        END
      ), 0) AS pnl,
      count(*)::integer AS trades,
      count(*) FILTER (WHERE status = 'won')::integer AS wins,
      count(*) FILTER (WHERE status = 'lost')::integer AS losses
    FROM test_positions
    WHERE wallet_address = target_wallet
  ) totals
  WHERE test_users.wallet_address = target_wallet;
END;
$$;

DO $$
DECLARE
  target_wallet varchar;
BEGIN
  FOR target_wallet IN SELECT wallet_address FROM users LOOP
    PERFORM refresh_user_stats(target_wallet);
  END LOOP;
  FOR target_wallet IN SELECT wallet_address FROM test_users LOOP
    PERFORM refresh_test_user_stats(target_wallet);
  END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS app_schema_migrations (
  version varchar(100) PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app_schema_migrations (version)
VALUES ('003_volume_uses_odds_adjusted_payout')
ON CONFLICT (version) DO NOTHING;

COMMIT;
