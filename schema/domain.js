const mongoose = require("mongoose");

const domainSchema = new mongoose.Schema({
  name: { type: String, required: true },
  registrationDate: { type: Date },
  expiryDate: { type: Date },
  autoRenewal: { type: Boolean, default: true },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  websiteId: { type: Number, required: true },
  price: { type: Number, required: true },
  dnsConfigured: { type: Boolean, default: false },
  sslConfigured: { type: Boolean, default: false },
});

const Domain = mongoose.model("Domain", domainSchema);

module.exports = Domain;
