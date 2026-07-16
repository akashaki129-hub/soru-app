-- Structured, investor-ready feedback collected from the homepage survey.
CREATE TABLE IF NOT EXISTS public.market_research_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_submission_id UUID NOT NULL UNIQUE,
  audience TEXT NOT NULL,
  statements TEXT[] NOT NULL,
  customer_order_frequency TEXT,
  customer_monthly_budget TEXT,
  chef_start_timeline TEXT,
  chef_support_needs TEXT[] NOT NULL DEFAULT '{}',
  city TEXT NOT NULL,
  contact TEXT,
  comments TEXT,
  source TEXT NOT NULL DEFAULT 'homepage_feedback_popup',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT market_research_audience_check CHECK (
    audience IN ('customer', 'home_cook', 'professional_chef', 'culinary_student', 'both')
  ),
  CONSTRAINT market_research_statements_check CHECK (
    cardinality(statements) BETWEEN 1 AND 6
    AND statements <@ ARRAY[
      'monthly_plan',
      'direct_from_chefs',
      'refer_a_cook',
      'earn_from_cooking',
      'personalized_nutrition',
      'routine_meals'
    ]::TEXT[]
  ),
  CONSTRAINT market_research_frequency_check CHECK (
    customer_order_frequency IS NULL
    OR customer_order_frequency IN ('1_2_weekly', '3_5_weekly', '6_plus_weekly')
  ),
  CONSTRAINT market_research_budget_check CHECK (
    customer_monthly_budget IS NULL
    OR customer_monthly_budget IN ('2999_3999', '4000_5999', '6000_plus', 'unsure')
  ),
  CONSTRAINT market_research_timeline_check CHECK (
    chef_start_timeline IS NULL
    OR chef_start_timeline IN ('ready_now', '1_3_months', 'exploring')
  ),
  CONSTRAINT market_research_support_check CHECK (
    chef_support_needs <@ ARRAY[
      'customers_orders',
      'food_license',
      'menu_pricing',
      'subscriptions',
      'kitchen_verification',
      'delivery'
    ]::TEXT[]
  ),
  CONSTRAINT market_research_city_check CHECK (
    city IN ('Bengaluru', 'Chennai', 'Hyderabad', 'Other')
  ),
  CONSTRAINT market_research_contact_check CHECK (
    contact IS NULL OR char_length(contact) BETWEEN 3 AND 255
  ),
  CONSTRAINT market_research_comments_check CHECK (
    comments IS NULL OR char_length(comments) <= 1500
  ),
  CONSTRAINT market_research_source_check CHECK (source = 'homepage_feedback_popup'),
  CONSTRAINT market_research_customer_answers_check CHECK (
    (
      audience IN ('customer', 'both')
      AND customer_order_frequency IS NOT NULL
      AND customer_monthly_budget IS NOT NULL
    )
    OR (
      audience NOT IN ('customer', 'both')
      AND customer_order_frequency IS NULL
      AND customer_monthly_budget IS NULL
    )
  ),
  CONSTRAINT market_research_chef_answers_check CHECK (
    (
      audience IN ('home_cook', 'professional_chef', 'culinary_student', 'both')
      AND chef_start_timeline IS NOT NULL
      AND cardinality(chef_support_needs) >= 1
    )
    OR (
      audience = 'customer'
      AND chef_start_timeline IS NULL
      AND cardinality(chef_support_needs) = 0
    )
  )
);

GRANT INSERT ON public.market_research_responses TO anon, authenticated;
GRANT SELECT ON public.market_research_responses TO authenticated;
GRANT ALL ON public.market_research_responses TO service_role;

ALTER TABLE public.market_research_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can share market feedback" ON public.market_research_responses;
CREATE POLICY "Anyone can share market feedback" ON public.market_research_responses
FOR INSERT TO anon, authenticated
WITH CHECK (
  source = 'homepage_feedback_popup'
  AND (comments IS NULL OR char_length(comments) <= 1500)
  AND (contact IS NULL OR char_length(contact) BETWEEN 3 AND 255)
);

DROP POLICY IF EXISTS "Admins read market feedback" ON public.market_research_responses;
CREATE POLICY "Admins read market feedback" ON public.market_research_responses
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS market_research_responses_created_at_idx
ON public.market_research_responses (created_at DESC);

CREATE INDEX IF NOT EXISTS market_research_responses_audience_idx
ON public.market_research_responses (audience);
