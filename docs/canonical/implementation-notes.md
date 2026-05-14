# Implementation Notes

## 1. Why this doc exists
Bo canonical core can giu sach, con cac chi tiet implementation hien tai duoc tach ra day de de cap nhat.

## 2. Known code-level deviations

### Submission workflow
- Code hien tai da di theo 2 cap approval.
- Mot so tai lieu cu van con mo ta 1 cap approval.
- Nen coi 2 cap la flow hien tai.

### Summary model
- Code summary dang nghi ve theo `form_id + period`, khong con giam sat hoan toan theo `campaign_id` nhu tai lieu cu.

### Template cell config
- `default_value` con ton tai trong entity, nhung khong nen coi day la runtime source cua du lieu dien san nua.

### Notification / outbox
- `app_outbox_events` dang duoc dung voi nghia notification queue trong code.
- Neu muon chuan hoa sau nay, nen tach ro outbox event va notification read model.

### Organization closure
- `organization_closure` duoc service su dung truc tiep.
- Khong co entity rieng trong TypeORM, nhung van la phan bat buoc cua read path.

## 3. Suggested next split
Neu bo tai lieu tiep tuc lon len, tach them:
- `template-rules.md`
- `campaign-rules.md`
- `submission-rules.md`
- `analytics-rules.md`
- `governance-rules.md`

## 4. What to update next
1. Dong bo lai `docs/db/overview.md`.
2. Dong bo lai `docs/db/erd.md`.
3. Dong bo lai cac file `docs/db/modules/*.md`.
4. De `docs/canonical/*` lam nguon tham chieu chinh.

