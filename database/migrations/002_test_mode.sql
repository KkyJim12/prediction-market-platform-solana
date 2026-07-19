BEGIN;

CREATE TABLE IF NOT EXISTS test_users (
  wallet_address varchar(44) PRIMARY KEY,
  balance_base_units numeric(20, 0) NOT NULL DEFAULT 0 CHECK (balance_base_units >= 0),
  faucet_claimed boolean NOT NULL DEFAULT false,
  lp_shares numeric(20, 0) NOT NULL DEFAULT 0 CHECK (lp_shares >= 0),
  volume_base_units numeric(20, 0) NOT NULL DEFAULT 0,
  realized_pnl_base_units numeric(21, 0) NOT NULL DEFAULT 0,
  base_volume_base_units numeric(20, 0) NOT NULL DEFAULT 0,
  trades integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_pool (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  vault_balance_base_units numeric(20, 0) NOT NULL,
  total_shares numeric(20, 0) NOT NULL,
  reserved_liability_base_units numeric(20, 0) NOT NULL DEFAULT 0,
  min_stake_base_units numeric(20, 0) NOT NULL DEFAULT 1000000,
  max_payout_base_units numeric(20, 0) NOT NULL DEFAULT 1000000000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO test_pool (id, vault_balance_base_units, total_shares)
VALUES (true, 100000000000, 100000000000) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS test_markets (
  id uuid PRIMARY KEY,
  fixture_id varchar(64) NOT NULL UNIQUE,
  competition varchar(160) NOT NULL,
  home_team varchar(160) NOT NULL,
  away_team varchar(160) NOT NULL,
  home_odds bigint NOT NULL CHECK (home_odds > 10000),
  draw_odds bigint NOT NULL CHECK (draw_odds > 10000),
  away_odds bigint NOT NULL CHECK (away_odds > 10000),
  betting_closes_at timestamptz NOT NULL,
  status varchar(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'voided')),
  result smallint CHECK (result BETWEEN 0 AND 2),
  total_staked_base_units numeric(20, 0) NOT NULL DEFAULT 0,
  unsettled_liability_base_units numeric(20, 0) NOT NULL DEFAULT 0,
  created_by varchar(44) NOT NULL REFERENCES test_users(wallet_address),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS test_positions (
  id uuid PRIMARY KEY,
  wallet_address varchar(44) NOT NULL REFERENCES test_users(wallet_address),
  market_id uuid NOT NULL REFERENCES test_markets(id),
  outcome smallint NOT NULL CHECK (outcome BETWEEN 0 AND 2),
  selection varchar(160) NOT NULL,
  stake_base_units numeric(20, 0) NOT NULL CHECK (stake_base_units > 0),
  locked_odds bigint NOT NULL CHECK (locked_odds > 10000),
  potential_payout_base_units numeric(20, 0) NOT NULL,
  amount_paid_base_units numeric(20, 0),
  status varchar(12) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'voided')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz
);

CREATE INDEX IF NOT EXISTS test_positions_wallet_idx ON test_positions (wallet_address, opened_at DESC);
CREATE INDEX IF NOT EXISTS test_positions_market_idx ON test_positions (market_id, status);

CREATE OR REPLACE FUNCTION refresh_test_user_stats(target_wallet varchar)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE test_users SET
    volume_base_units = totals.volume,
    base_volume_base_units = totals.base_volume,
    realized_pnl_base_units = totals.pnl,
    trades = totals.trades,
    wins = totals.wins,
    losses = totals.losses,
    updated_at = now()
  FROM (
    SELECT COALESCE(sum(potential_payout_base_units), 0) volume,
      COALESCE(sum(stake_base_units), 0) base_volume,
      COALESCE(sum(CASE WHEN status = 'won' THEN COALESCE(amount_paid_base_units, potential_payout_base_units) - stake_base_units
        WHEN status = 'lost' THEN -stake_base_units ELSE 0 END), 0) pnl,
      count(*)::integer trades,
      count(*) FILTER (WHERE status = 'won')::integer wins,
      count(*) FILTER (WHERE status = 'lost')::integer losses
    FROM test_positions WHERE wallet_address = target_wallet
  ) totals WHERE test_users.wallet_address = target_wallet;
END; $$;

CREATE OR REPLACE FUNCTION test_positions_refresh_stats()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_test_user_stats(OLD.wallet_address);
    RETURN OLD;
  END IF;
  PERFORM refresh_test_user_stats(NEW.wallet_address);
  IF TG_OP = 'UPDATE' AND OLD.wallet_address <> NEW.wallet_address THEN
    PERFORM refresh_test_user_stats(OLD.wallet_address);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS test_positions_stats_trigger ON test_positions;
CREATE TRIGGER test_positions_stats_trigger AFTER INSERT OR UPDATE OR DELETE ON test_positions
FOR EACH ROW EXECUTE FUNCTION test_positions_refresh_stats();

COMMIT;
