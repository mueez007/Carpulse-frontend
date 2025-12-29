import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  getAllLogs,
  getMechanics,
  createLog,
  updateLog,
  deleteLog,
} from "../api/logsApi.js";
import "../styles/logs.css";

// small helper
function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

function LogCard({ log, onEdit, onDelete }) {
  return (
    <div className="log-card">
      <div className="log-info">
        <h3>{log.vehicle_model || "Unknown Model"}</h3>
        <p>
          <strong>Owner:</strong> {log.owner_name || "N/A"}
        </p>
        <p>
          <strong>Owner Phone:</strong>{" "}
          {log.owner_phone_number || "N/A"}
        </p>
        <p>
          <strong>Vehicle ID:</strong> {log.vehicle_id || "N/A"}
        </p>
        <p>
          <strong>Service Date:</strong> {formatDate(log.service_date)}
        </p>
        <p>
          <strong>Service Type:</strong> {log.service_type || "N/A"}
        </p>
        {log.mechanic_name && (
          <p>
            <strong>Mechanic name:</strong> {log.mechanic_name || "N/A"}
          </p>
        )}
        <p>
          <strong>Description:</strong>{" "}
          {log.description || "No description"}
        </p>
        <p>
          <strong>Mileage:</strong>{" "}
          {log.mileage ? `${log.mileage} km` : "N/A"}
        </p>
        <p>
          <strong>Cost:</strong> ₹{log.cost ?? 0}
        </p>
        <p>
          <strong>Next Service:</strong> {formatDate(log.next_service_date)}
        </p>
      </div>

      <div className="log-actions">
        <button className="btn-edit" onClick={() => onEdit(log)}>
          <i className="fa-solid fa-pen" /> Edit
        </button>
        <button className="btn-delete" onClick={() => onDelete(log.id)}>
          <i className="fa-solid fa-trash" /> Delete
        </button>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ open, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="modal" onClick={onCancel}>
      <div
        className="modal-content"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <h3>Confirm Delete</h3>
        <p>Are you sure you want to delete this service log?</p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onConfirm}>
            Delete
          </button>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const emptyLog = {
  owner_name: "",
  owner_phone_number: "", // ✅ NEW FIELD
  vehicle_model: "",
  vehicle_id: "",
  service_date: "",
  service_type: "",
  mechanic_name: "",
  description: "",
  mileage: "",
  cost: "",
  next_service_date: "",
};

function LogFormModal({ open, initialLog, mechanics, onClose, onSave }) {
  const [values, setValues] = useState(emptyLog);

  useEffect(() => {
    if (!open) return;

    if (initialLog) {
      setValues({
        ...emptyLog,
        ...initialLog,
        service_date: initialLog.service_date
          ? initialLog.service_date.split("T")[0]
          : "",
        next_service_date: initialLog.next_service_date
          ? initialLog.next_service_date.split("T")[0]
          : "",
      });
    } else {
      const today = new Date();
      const next = new Date(today);
      next.setMonth(today.getMonth() + 6);
      setValues({
        ...emptyLog,
        next_service_date: next.toISOString().split("T")[0],
      });
    }
  }, [initialLog, open]);

  if (!open) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    let vehicle_id = values.vehicle_id.trim();
    if (!vehicle_id) {
      const model = values.vehicle_model.trim().replace(/\s+/g, "_").toLowerCase();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      vehicle_id = `${model}_${randomNum}`;
    }

    const payload = {
      owner_name: values.owner_name.trim(),
      owner_phone_number: values.owner_phone_number.trim(), // ✅ SEND TO BACKEND
      vehicle_model: values.vehicle_model.trim(),
      vehicle_id,
      service_date: new Date(values.service_date).toISOString(),
      service_type: values.service_type,
      mechanic_name: values.mechanic_name|| null,
      description: values.description.trim(),
      mileage: parseInt(values.mileage || "0", 10),
      cost: parseFloat(values.cost || "0"),
      next_service_date: values.next_service_date
        ? new Date(values.next_service_date).toISOString()
        : null,
    };

    onSave(payload);
  }

  return (
    <div className="modal" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <h3>{initialLog ? "Edit Service Log" : "Add New Service Log"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="owner_name">Owner Name *</label>
            <input
              id="owner_name"
              name="owner_name"
              required
              value={values.owner_name}
              onChange={handleChange}
            />
          </div>

          {/* ✅ NEW FIELD: Owner Phone Number */}
          <div className="form-group">
            <label htmlFor="owner_phone_number">Owner Phone Number *</label>
            <input
              id="owner_phone_number"
              name="owner_phone_number"
              required
              placeholder="+91 98765 43210"
              value={values.owner_phone_number}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="vehicle_model">Vehicle Model *</label>
            <input
              id="vehicle_model"
              name="vehicle_model"
              required
              placeholder="e.g., Hyundai Creta, Maruti Swift"
              value={values.vehicle_model}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="vehicle_id">Vehicle ID</label>
            <input
              id="vehicle_id"
              name="vehicle_id"
              placeholder="Auto-generated if empty"
              value={values.vehicle_id}
              onChange={handleChange}
            />
            <small>Leave empty to auto-generate</small>
          </div>

          <div className="form-group">
            <label htmlFor="service_date">Service Date *</label>
            <input
              id="service_date"
              name="service_date"
              type="date"
              required
              value={values.service_date}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
  <label htmlFor="service_type">Service Type *</label>
  <input
    id="service_type"
    name="service_type"
    required
    placeholder="e.g., Brake Service, Engine Repair"
    value={values.service_type}
    onChange={handleChange}
  />
</div>


          <div className="form-group">
  <label htmlFor="mechanic_name">Mechanic name</label>
  <input
    id="mechanic_name"
    name="mechanic_name"
    placeholder="Enter mechanic name or leave empty"
    value={values.mechanic_name || ""}
    onChange={handleChange}
  />
</div>


          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Details about the service performed..."
              value={values.description}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="mileage">Mileage (km) *</label>
            <input
              id="mileage"
              name="mileage"
              type="number"
              min="0"
              required
              value={values.mileage}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cost">Cost (₹) *</label>
            <input
              id="cost"
              name="cost"
              type="number"
              step="0.01"
              min="0"
              required
              value={values.cost}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="next_service_date">Next Service Date *</label>
            <input
              id="next_service_date"
              name="next_service_date"
              type="date"
              required
              value={values.next_service_date}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions">
            <button className="btn" type="submit">
              Save Service Log
            </button>
            <button
              type="button"
              className="btn btn-secondary-outline"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [logsRes, mechanicsRes] = await Promise.all([
        getAllLogs(token),
        getMechanics(token),
      ]);
      setLogs(Array.isArray(logsRes) ? logsRes : []);
      setMechanics(Array.isArray(mechanicsRes) ? mechanicsRes : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load vehicle service logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleAddClick = () => {
    setSelectedLog(null);
    setModalOpen(true);
  };

  const handleEdit = (log) => {
    setSelectedLog(log);
    setModalOpen(true);
  };

  const handleDeleteRequest = (id) => {
    setLogToDelete(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!logToDelete) return;
    try {
      await deleteLog(logToDelete, token);
      setDeleteOpen(false);
      setLogToDelete(null);
      loadData();
    } catch (err) {
      console.error("Error deleting log:", err);
      setDeleteOpen(false);
    }
  };

  const handleSaveLog = async (payload) => {
    try {
      if (selectedLog && selectedLog.id) {
        await updateLog(selectedLog.id, { ...payload, id: selectedLog.id }, token);
      } else {
        await createLog(payload, token);
      }
      setModalOpen(false);
      setSelectedLog(null);
      loadData();
    } catch (err) {
      console.error("Error saving log:", err);
    }
  };

  return (
    <div className="logs-page">
      <div className="logs-header">
        <h2>All Vehicle Service Logs</h2>
        <button className="btn" onClick={handleAddClick}>
          <i className="fa-solid fa-plus" /> Add Service Log
        </button>
      </div>

      {loading && <p>Loading vehicle service logs...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <section className="log-list">
          {logs.length === 0 ? (
            <p>No vehicle service logs found. Add a new one!</p>
          ) : (
            logs.map((log) => (
              <LogCard
                key={log.id}
                log={log}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            ))
          )}
        </section>
      )}

      <LogFormModal
        open={modalOpen}
        initialLog={selectedLog}
        mechanics={mechanics}
        onClose={() => {
          setModalOpen(false);
          setSelectedLog(null);
        }}
        onSave={handleSaveLog}
      />

      <DeleteConfirmModal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
