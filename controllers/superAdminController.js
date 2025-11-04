const bcrypt = require("bcryptjs");
const { SuperAdmin, Client, HR, Candidate } = require("../models");

exports.getDashboardData = async (req, res) => {
  try {
    const clients = await Client.find().select("-password");
    const hrs = await HR.find().select("-password");
    const candidates = await Candidate.find();
    res.json({
      superadmin: { email: req.user.email },
      stats: {
        totalClients: clients.length,
        totalHRs: hrs.length,
        totalCandidates: candidates.length,
      },
      clients,
      hrs,
      candidates,
    });
  } catch (err) {
    console.error("SuperAdmin data fetch error:", err.message);
    res.status(500).json({ message: "Failed to fetch superadmin data" });
  }
};

exports.createHr = async (req, res) => {
  try {
    // 1. Destructure the 'role' from the request body.
    const { name, email, password, role } = req.body;

    if (await HR.findOne({ email })) {
        return res.status(400).json({ message: "HR with this email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Include the 'role' when creating the new HR document.
    const hr = new HR({ name, email, password: hashedPassword, role });
    
    await hr.save();
    const hrObj = hr.toObject();
    delete hrObj.password;
    res.status(201).json(hrObj);
  } catch (err) {
    console.error("Create HR error:", err.message);
    res.status(500).json({ message: "Failed to create HR user" });
  }
};
exports.createClient = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await Client.findOne({ email })) {
      return res.status(400).json({ message: "Client with this email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const client = new Client({ name, email, password: hashedPassword });
    await client.save();
    const clientObj = client.toObject();
    delete clientObj.password;
    res.status(201).json(clientObj);
  } catch (err) {
    console.error("Create Client error:", err.message);
    res.status(500).json({ message: "Failed to create Client user" });
  }
};

exports.assignClientToHr = async (req, res) => {
  try {
    const { hrId, clientId } = req.body;
    const hr = await HR.findById(hrId);
    const client = await Client.findById(clientId);
    if (!hr || !client) {
      return res.status(404).json({ message: "HR or Client not found" });
    }
    if (!hr.assignedClientIds.includes(clientId)) {
      hr.assignedClientIds.push(clientId);
      await hr.save();
    }
    res.json({ message: "Client assigned successfully" });
  } catch (err) {
    console.error("Assign error:", err.message);
    res.status(500).json({ message: "Failed to assign Client" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = type === "hrs" ? HR : Client;
    let updateData = { ...req.body };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    const updated = await Model.findByIdAndUpdate(id, updateData, { new: true }).select("-password");
    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Update user error:", err.message);
    res.status(500).json({ message: "Failed to update user" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = type === "hrs" ? HR : Client;
    const deletedItem = await Model.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({ message: "User not found" });
    }
    // If a client is deleted, remove them from any HR they were assigned to
    if (type === "clients") {
      await HR.updateMany({ assignedClientIds: id }, { $pull: { assignedClientIds: id } });
    }
    res.json({ message: `${type.slice(0, -1)} deleted successfully` });
  } catch (err) {
    console.error("Delete user error:", err.message);
    res.status(500).json({ message: "Failed to delete user" });
  }
};