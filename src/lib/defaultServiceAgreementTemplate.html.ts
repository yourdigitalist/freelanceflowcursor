/**
 * Standard Service Agreement — default for new accounts.
 * Keep in sync with supabase/functions/_shared/default-contract-template.ts
 */
export const DEFAULT_SERVICE_AGREEMENT_TEMPLATE_HTML = `<h1>SERVICE AGREEMENT</h1>
<p><br></p>
<h2>IDENTIFICATION OF THE CONTRACTING PARTIES</h2>
<div class="contract-party-block">
<p class="contract-party-title"><strong>CLIENT</strong></p>
{{client_identification}}
</div>
<div class="contract-party-block">
<p class="contract-party-title"><strong>SERVICE PROVIDER</strong></p>
{{freelancer_identification}}
</div>
<p>The parties identified above agree to the following Service Agreement, which shall be governed by the clauses and conditions described in this document.</p>
<p><br></p>
<p><br></p>
<h2>SCOPE OF WORK</h2>
<p><strong>Clause 1.</strong> This agreement covers the provision of services by the SERVICE PROVIDER to the CLIENT, consisting of the following activities:</p>
<p>{{services}}</p>
<p><strong>Clause 2.</strong> Work will commence upon receipt of all required materials from the CLIENT, or upon payment of the deposit defined in Clause 16, whichever occurs last, and will be completed within {{timeline_days}}.</p>
<p><strong>Clause 3.</strong> Additional work outside the agreed scope will be subject to a new commercial proposal. Timelines apply to the original scope only. Any changes in quantity, deliverables, or direction may affect pricing and deadlines and must be renegotiated in writing.</p>
<p><br></p>
<p><br></p>
<h2>CLIENT OBLIGATIONS</h2>
<p><strong>Clause 4.</strong> To provide all materials, content, and documents requested by the SERVICE PROVIDER within the timeframes established in this agreement. Delays in providing materials will not be the responsibility of the SERVICE PROVIDER and may affect the project timeline.</p>
<p><strong>Clause 5.</strong> To appoint a representative who will be available to answer questions and discuss project details with the SERVICE PROVIDER in a timely manner.</p>
<p><strong>Clause 6.</strong> To provide clear and complete information regarding the project requirements, objectives, and any relevant specifications prior to commencement of work.</p>
<p><strong>Clause 7.</strong> To make payments on the agreed dates. Late payments will incur the charges described in Clause 17.</p>
<p><strong>Clause 8.</strong> If the project requires any third-party services, tools, software licences, or external costs, these shall be covered by the CLIENT unless otherwise agreed in writing.</p>
<p><strong>Clause 9.</strong> In the event of any third-party payment as described in the clause above, the CLIENT shall provide proof of payment and a written record of the purpose of that payment shall be attached to this agreement.</p>
<p><strong>Clause 10.</strong> To collaborate with the SERVICE PROVIDER in establishing a project schedule, including delivery dates and key milestones, where reasonably foreseeable.</p>
<p><br></p>
<p><br></p>
<h2>SERVICE PROVIDER OBLIGATIONS</h2>
<p><strong>Clause 11.</strong> To deliver the project within the agreed timeframe, respecting the scope and specifications communicated by the CLIENT prior to commencement.</p>
<p><strong>Clause 12.</strong> To proactively communicate with the CLIENT whenever clarification or additional information is needed in order to proceed with the work.</p>
<p><strong>Clause 13.</strong> To notify the CLIENT of any delays in delivery, along with the reasons for such delays, as soon as they become apparent.</p>
<p><strong>Clause 14.</strong> To deliver all services with professional quality and in accordance with industry standards.</p>
<p><strong>Clause 15.</strong> To appoint a representative who will be available to the CLIENT for ongoing communication, updates, and clarifications throughout the project.</p>
<p><br></p>
<p><br></p>
<h2>PAYMENT</h2>
<p><strong>Clause 16.</strong> In consideration for the services provided under this agreement, the CLIENT agrees to pay the SERVICE PROVIDER the total amount of {{total}}, as follows:</p>
<p>{{payment_structure}}</p>
<p>{{payment_methods}}</p>
<p>{{installment_description}}</p>
<p>{{payment_link}}</p>
<p><strong>Clause 17.</strong> In the event of late payment or default on any instalment, a monthly interest rate of 1% will apply, plus a penalty of 10% on the total contract value, and a late fee of 2% of the outstanding amount.</p>
<p><br></p>
<p><br></p>
<h2>TERMINATION</h2>
<p><strong>Clause 18.</strong> This agreement may not be terminated without just cause. Termination without cause will result in a penalty equivalent to the total value stated in Clause 16.</p>
<p>Sole paragraph. In the event of cancellation by the CLIENT before work has commenced, a cancellation fee of 50% of the total contract value will apply.</p>
<p><strong>Clause 19.</strong> This agreement will also be considered terminated in the event that either party fails to comply with any of its clauses.</p>
<p><br></p>
<p><br></p>
<h2>INTELLECTUAL PROPERTY</h2>
<p><strong>Clause 20.</strong> Upon receipt of full payment, the SERVICE PROVIDER assigns to the CLIENT all intellectual property rights over all work created under this agreement. The CLIENT may edit, reproduce, publish, resell, or otherwise use the deliverables without restriction.</p>
<p><br></p>
<p><br></p>
<h2>NON-EXCLUSIVITY</h2>
<p><strong>Clause 21.</strong> The SERVICE PROVIDER does not operate exclusively within the CLIENT's industry or market segment and may provide services to other clients and businesses.</p>
<p><strong>Clause 22.</strong> The SERVICE PROVIDER retains full autonomy over how and when work is carried out, subject only to the agreed project schedule. This agreement does not create any employment relationship or obligation to work fixed hours.</p>
<p><br></p>
<p><br></p>
<h2>CONFIDENTIALITY</h2>
<p><strong>Clause 23.</strong> Both parties agree to keep strictly confidential all data, personal information, business information, and any other information shared in the course of this agreement, whether written or verbal. Neither party may disclose, reproduce, or share such information with third parties without the prior written consent of the other party.</p>
<p><br></p>
<p><br></p>
<h2>CONTRACT VALIDITY</h2>
<p><strong>Clause 24.</strong> This agreement remains in force until the project is completed, all deliverables have been delivered, and all payments have been made in full, whichever occurs last.</p>
<p><strong>Clause 25.</strong> The expiry of this agreement does not release either party from obligations relating to confidentiality, non-disclosure, or professional conduct that arose during the term of this agreement.</p>
<p><br></p>
<p><br></p>
<h2>ELECTRONIC SIGNATURE</h2>
<p><strong>Clause 26.</strong> Both parties agree that this contract will be signed electronically via Lance (getlance.app) and acknowledge its legal integrity and validity. Lance is not responsible for the content of this contract, which remains the sole responsibility of both parties.</p>
<p><br></p>
<p><br></p>
<h2>GENERAL PROVISIONS</h2>
<p><strong>Clause 27.</strong> This agreement does not create an employment relationship between the parties. The SERVICE PROVIDER operates as an independent contractor and is not subject to the CLIENT's direction, supervision, or control beyond the agreed project scope.</p>
<p><strong>Clause 28.</strong> The engagement of the SERVICE PROVIDER under this agreement, whether exclusive or non-exclusive, continuous or otherwise, does not constitute employment under any applicable employment law.</p>
<p><strong>Clause 29.</strong> The failure of either party to enforce any term or condition of this agreement shall not be considered a waiver of that term or condition, nor shall it affect that party's right to enforce it in the future.</p>
<p>{{additional_clause}}</p>
<p><br></p>
<p><br></p>
<h2>GOVERNING LAW</h2>
<p>The courts of {{freelancer_address}} shall have exclusive jurisdiction over any disputes arising from this agreement. The parties agree that no other jurisdiction shall apply.</p>`;
