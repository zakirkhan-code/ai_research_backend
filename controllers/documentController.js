const Document = require('../models/Document');
const Project = require('../models/Project');
const fs = require('fs');
const path = require('path');
const uploadDocument = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, category, tags, isPublic } = req.body;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );
    if (!isMember && project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to upload documents to this project'
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    const versionInfo = {
      versionNumber: 1,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
      changeLog: 'Initial upload'
    };
    const document = new Document({
      title: title.trim(),
      description: description ? description.trim() : '',
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      fileExtension: path.extname(req.file.originalname),
      project: projectId,
      uploadedBy: req.user._id,
      currentVersion: 1,
      versions: [versionInfo],
      category: category || 'other',
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      permissions: {
        isPublic: isPublic === 'true' || isPublic === true,
        allowedUsers: []
      },
      status: 'active'
    });

    await document.save();

    await document.populate('uploadedBy', 'username email');

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document
    });

  } catch (error) {
    console.error('Upload error:', error);

    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
};


const updateDocument = async (req, res) => {
  try {
    console.log('Update document request:', req.params.documentId);
    
    const { documentId } = req.params;
    const { title, description, category, tags, isPublic } = req.body;

    // Find document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }


    if (document.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Document not available for editing'
      });
    }


    const project = await Project.findById(document.project);
    const isOwner = document.uploadedBy.toString() === req.user._id.toString();
    const isProjectManager = project.createdBy.toString() === req.user._id.toString();
    
    if (!isOwner && !isProjectManager) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own documents or if you are project manager'
      });
    }

    // Update allowed fields
    const updateData = {};
    
    if (title && title.trim()) {
      updateData.title = title.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description.trim();
    }
    
    if (category) {
      updateData.category = category;
    }
    
    if (tags !== undefined) {
      updateData.tags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    }
    
    if (isPublic !== undefined) {
      updateData['permissions.isPublic'] = isPublic === 'true' || isPublic === true;
    }

    // Update document
    const updatedDocument = await Document.findByIdAndUpdate(
      documentId,
      updateData,
      { new: true, runValidators: true }
    ).populate('uploadedBy', 'username email');


    res.json({
      success: true,
      message: 'Document updated successfully',
      data: updatedDocument
    });

  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update document'
    });
  }
};


const getProjectDocuments = async (req, res) => {
  try {

    
    const { projectId } = req.params;
    const { search, category, page = 1, limit = 12 } = req.query;


    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is project member
    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );
    
    if (!isMember && project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view documents in this project'
      });
    }

    // Build query - only active documents
    let query = { 
      project: projectId,
      status: 'active'
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (category) {
      query.category = category;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get documents with pagination
    const [documents, totalDocuments] = await Promise.all([
      Document.find(query)
        .populate('uploadedBy', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Document.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalDocuments / parseInt(limit));


    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalDocuments,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch documents'
    });
  }
};

const downloadDocument = async (req, res) => {
  try {
    
    const { documentId } = req.params;

    // Find document
    const document = await Document.findById(documentId).populate('project');
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if document is active
    if (document.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Document not available'
      });
    }

    // Check if user has download permission using your model method
    const hasPermission = document.hasPermission(req.user._id, 'download') || 
                         document.hasPermission(req.user._id, 'view');
    
    // Also check if user is project member
    const project = document.project;
    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );
    
    if (!hasPermission && 
        !isMember && 
        project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to download this document'
      });
    }

    // Check if file exists
    const filePath = document.filePath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }


    // Record download in statistics
    document.downloads.push({
      user: req.user._id,
      downloadedAt: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    // Update view count and last viewed
    document.viewCount += 1;
    document.lastViewedAt = new Date();
    
    await document.save();

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', document.fileSize);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error streaming file'
        });
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Download failed'
    });
  }
};

// ==================== UPDATE PERMISSIONS ====================
const updatePermissions = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { permissions } = req.body;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user is document owner
    if (document.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only document owner can update permissions'
      });
    }

    // Update permissions
    document.permissions = {
      ...document.permissions,
      ...permissions
    };

    await document.save();

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: document
    });

  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update permissions'
    });
  }
};

// ==================== DELETE DOCUMENT ====================
const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { hardDelete = false } = req.query;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user is document owner OR project manager
    const project = await Project.findById(document.project);
    const isOwner = document.uploadedBy.toString() === req.user._id.toString();
    const isProjectManager = project.createdBy.toString() === req.user._id.toString();
    
    if (!isOwner && !isProjectManager) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own documents or if you are project manager'
      });
    }

    if (hardDelete === 'true') {
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
        console.log('Physical file deleted:', document.filePath);
      }

      // Delete all versions
      document.versions.forEach(version => {
        if (fs.existsSync(version.filePath)) {
          fs.unlinkSync(version.filePath);
        }
      });

      // Remove from database
      await Document.findByIdAndDelete(documentId);

      res.json({
        success: true,
        message: 'Document permanently deleted'
      });

    } else {
      
      document.status = 'deleted';
      await document.save();

      console.log('Document soft deleted:', documentId);

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    }

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete document'
    });
  }
};

// ==================== RESTORE DOCUMENT ====================
const restoreDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    const project = await Project.findById(document.project);
    const isOwner = document.uploadedBy.toString() === req.user._id.toString();
    const isProjectManager = project.createdBy.toString() === req.user._id.toString();
    
    if (!isOwner && !isProjectManager) {
      return res.status(403).json({
        success: false,
        message: 'You can only restore your own documents'
      });
    }

    if (document.status !== 'deleted') {
      return res.status(400).json({
        success: false,
        message: 'Document is not deleted'
      });
    }

    document.status = 'active';
    await document.save();

    res.json({
      success: true,
      message: 'Document restored successfully',
      data: document
    });

  } catch (error) {
    console.error('Restore document error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore document'
    });
  }
};

// ==================== GET DELETED DOCUMENTS ====================
const getDeletedDocuments = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Check if user is project manager
    const project = await Project.findById(projectId);
    if (!project || project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only project managers can view deleted documents'
      });
    }

    const deletedDocs = await Document.find({
      project: projectId,
      status: 'deleted'
    }).populate('uploadedBy', 'username email')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: deletedDocs
    });

  } catch (error) {
    console.error('Get deleted documents error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch deleted documents'
    });
  }
};

// ==================== GET DOCUMENT DETAILS ====================
const getDocumentDetails = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId)
      .populate('uploadedBy', 'username email')
      .populate('project', 'title');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('Get document details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch document details'
    });
  }
};

module.exports = {
  uploadDocument,
  updateDocument,
  getProjectDocuments,
  downloadDocument,
  updatePermissions,
  deleteDocument,
  restoreDocument,
  getDeletedDocuments,
  getDocumentDetails
};
